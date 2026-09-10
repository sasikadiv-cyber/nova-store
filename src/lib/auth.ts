import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

/**
 * Shop-owner authentication.
 *
 * Credentials come from the environment so the storefront owner can rotate
 * them without a code change:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET
 *
 * The session is a signed, httpOnly cookie — the signature stops anyone from
 * forging a token, and the expiry stops stale sessions.
 */

const COOKIE_NAME = "nova_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "owner@nova.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "nova-admin";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "nova-atelier-signing-key-2026";

export const OWNER_EMAIL = ADMIN_EMAIL;

function sign(payload: string) {
  return createHmac("sha256", ADMIN_SECRET).update(payload).digest("base64url");
}

export function verifyCredentials(email: string, password: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
}

export async function createAdminSession() {
  const payload = Buffer.from(
    JSON.stringify({ sub: ADMIN_EMAIL, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
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

export async function isAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token || !token.includes(".")) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

/** Guard for every server action — throws before any write happens. */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized: shop owner access only.");
  }
}
