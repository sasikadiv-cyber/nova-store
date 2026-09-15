import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { customers, type Customer } from "@/db/schema";

/**
 * Customer account authentication.
 *
 * Passwords are hashed with scrypt (salt per user, never reversible) and the
 * session is a signed httpOnly cookie — the same approach as the shop-owner
 * console, but a separate cookie and secret so the two can never be confused.
 */

const COOKIE_NAME = "nova_customer";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/* Never a publicly known constant: fall back to a key derived from this
   deployment's own configuration, unique per installation. */
function deriveSecret(scope: string) {
  const seed = process.env.CUSTOMER_SECRET ?? process.env.ADMIN_SECRET ?? process.env.DATABASE_URL ?? "";
  if (!seed) return "";
  return createHash("sha256").update(`nova:${scope}:${seed}`).digest("base64url");
}

const CUSTOMER_SECRET = deriveSecret("client");

if (!CUSTOMER_SECRET) {
  throw new Error(
    "CUSTOMER_SECRET (or ADMIN_SECRET, or DATABASE_URL) must be set so client sessions can be signed.",
  );
}

if (process.env.NODE_ENV === "production" && !process.env.CUSTOMER_SECRET) {
  console.warn(
    "[nova] CUSTOMER_SECRET is not set — deriving a signing key from the environment. " +
      "Set CUSTOMER_SECRET explicitly for a stable key.",
  );
}

/* --------------------------------------------------------------- passwords */

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/* ---------------------------------------------------------------- sessions */

function sign(payload: string) {
  return createHmac("sha256", CUSTOMER_SECRET).update(payload).digest("base64url");
}

export async function createCustomerSession(customerId: number) {
  const payload = Buffer.from(
    JSON.stringify({ sub: customerId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
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

export async function destroyCustomerSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      sub?: number;
      exp?: number;
    };
    if (typeof data.exp === "number" && data.exp <= Date.now()) return null;
    if (typeof data.sub !== "number") return null;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, data.sub))
      .limit(1);
    return customer ?? null;
  } catch {
    return null;
  }
}

export const CUSTOMER_COOKIE_NAME = COOKIE_NAME;
