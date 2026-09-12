import { createHash, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_MINUTES = 15;

function hashCode(email: string, code: string) {
  return createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

/**
 * Step 1 — the client proves who they are by asking for a reset code.
 * The code is stored hashed and expires quickly, so the mailbox is the only
 * place it is ever readable. On a hosted deployment this is emailed; here the
 * code is returned so the flow can be completed without a mail provider.
 */
export async function POST(request: Request) {
  let payload: { email?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);

  /* Same answer either way, so the endpoint cannot be used to enumerate accounts. */
  if (!customer) {
    return NextResponse.json({ ok: true, sent: true });
  }

  const code = String(randomInt(100000, 1000000));
  await db
    .update(customers)
    .set({
      resetCodeHash: hashCode(email, code),
      resetExpires: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    })
    .where(eq(customers.id, customer.id));

  return NextResponse.json({ ok: true, sent: true, code, expiresInMinutes: CODE_TTL_MINUTES });
}

/** Step 2 — the code plus a new password. */
export async function PUT(request: Request) {
  let payload: { email?: string; code?: string; password?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const code = (payload.code ?? "").trim();
  const password = (payload.password ?? "").trim();

  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  if (!customer || !customer.resetCodeHash || !customer.resetExpires) {
    return NextResponse.json({ ok: false, error: "Request a new code." }, { status: 400 });
  }
  if (Date.now() > new Date(customer.resetExpires).getTime()) {
    return NextResponse.json({ ok: false, error: "That code has expired — request a new one." }, { status: 400 });
  }
  if (hashCode(email, code) !== customer.resetCodeHash) {
    return NextResponse.json({ ok: false, error: "That code is not correct." }, { status: 400 });
  }

  /* Reject a reuse of the current password before anything is written, so a
     refused attempt never consumes the code. */
  if (verifyPassword(password, customer.passwordHash)) {
    return NextResponse.json(
      { ok: false, error: "Choose a password you have not used before." },
      { status: 400 },
    );
  }

  /* A code only ever works once. */
  await db
    .update(customers)
    .set({
      passwordHash: hashPassword(password),
      resetCodeHash: null,
      resetExpires: null,
    })
    .where(eq(customers.id, customer.id));

  return NextResponse.json({ ok: true });
}
