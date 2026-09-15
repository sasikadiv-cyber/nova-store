import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";

/**
 * Console authentication with two roles.
 *
 *   owner         — the store owner, credentials from the environment
 *                   (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET). Full access.
 *   stock_manager — a team member the owner creates in the console. Access to
 *                   the catalogue, stock, orders, reviews and messages only.
 *
 * The session is a signed, httpOnly cookie carrying the role, so a demoted or
 * removed manager loses access the moment their row is deactivated.
 */

const COOKIE_NAME = "nova_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "owner@nova.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "nova-admin";

/* The signing key must never be a publicly known constant, or anyone could
   forge a session cookie. When the operator has not set ADMIN_SECRET we
   derive one from this deployment's own database URL instead — unique per
   deployment and unknowable without the database credentials. Setting
   ADMIN_SECRET explicitly is still recommended. */
function deriveSecret(scope: string) {
  const seed = process.env.ADMIN_SECRET ?? process.env.DATABASE_URL ?? "";
  if (!seed) return "";
  return createHash("sha256").update(`nova:${scope}:${seed}`).digest("base64url");
}

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? deriveSecret("admin");

if (!ADMIN_SECRET) {
  throw new Error(
    "ADMIN_SECRET (or DATABASE_URL) must be set so console sessions can be signed.",
  );
}

if (process.env.NODE_ENV === "production" && !process.env.ADMIN_SECRET) {
  console.warn(
    "[nova] ADMIN_SECRET is not set — deriving a signing key from DATABASE_URL. " +
      "Set ADMIN_SECRET explicitly for a stable key across database migrations.",
  );
}

export const OWNER_EMAIL = ADMIN_EMAIL;

export type AdminRole = "owner" | "stock_manager" | "support";

/** Roles that may write to the catalogue. */
const MANAGER_ROLES: AdminRole[] = ["owner", "stock_manager"];

function normaliseRole(value: string): AdminRole {
  if (value === "support") return "support";
  return "stock_manager";
}

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
};

function sign(payload: string) {
  return createHmac("sha256", ADMIN_SECRET).update(payload).digest("base64url");
}

/* --------------------------------------------------------------- passwords */

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyAdminPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/* ------------------------------------------------------------- credentials */

/** Checks the owner (environment) first, then the team table. */
export async function verifyCredentials(email: string, password: string): Promise<AdminUser | null> {
  const normalised = email.trim().toLowerCase();

  if (normalised === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
    return { id: 0, email: ADMIN_EMAIL, name: "Store owner", role: "owner" };
  }

  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalised))
    .limit(1);

  if (!row || !row.active) return null;
  if (!verifyAdminPassword(password, row.passwordHash)) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name || row.email,
    role: normaliseRole(row.role),
  };
}

/* ----------------------------------------------------------------- session */

export async function createAdminSession(user: AdminUser) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.email,
      uid: user.id,
      role: user.role,
      name: user.name,
      exp: Date.now() + MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");

  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The signed-in console user, with their role — or null. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  let data: { sub?: string; uid?: number; role?: string; name?: string; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (!data?.exp || Date.now() > data.exp) return null;

  /* The owner never lives in the table, so the signature alone is enough. */
  if (data.role === "owner" && data.sub?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { id: 0, email: ADMIN_EMAIL, name: data.name || "Store owner", role: "owner" };
  }

  /* Team members are re-checked on every request, so deactivating a manager
     takes effect immediately. */
  if (typeof data.uid === "number" && data.uid > 0) {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, data.uid)).limit(1);
    if (row && row.active) {
      return {
        id: row.id,
        email: row.email,
        name: row.name || row.email,
        role: normaliseRole(row.role),
      };
    }
  }

  return null;
}

export async function isAdmin() {
  return (await getCurrentAdmin()) !== null;
}

/** Any console user. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin");
  return admin;
}

/** Only the store owner — for appearance, pages, pricing and team settings. */
export async function requireOwner() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "owner") redirect("/admin");
  return admin;
}

/** Owner or stock manager — anyone who may write to the catalogue. Support
 *  team members can read the console but cannot change products or stock. */
export async function requireManager() {
  const admin = await getCurrentAdmin();
  if (!admin || !MANAGER_ROLES.includes(admin.role)) redirect("/admin");
  return admin;
}

/** Page-level guard with the same rule as requireManager. */
export async function requireManagerPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !MANAGER_ROLES.includes(admin.role)) notFound();
  return admin;
}

/** Records a team member's sign-in for the profile and team pages. */
export async function recordAdminLogin(userId: number) {
  if (userId > 0) {
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, userId));
  }
}
