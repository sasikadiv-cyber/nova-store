import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { customers } from "@/db/schema";
import {
  createCustomerSession,
  hashPassword,
  verifyPassword,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Creates a client session (sign in) or a new account (sign up).
 * A plain route handler rather than a server action, so the write path is
 * independent of the build-time action registry.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
    }
  }

  let payload: {
    mode?: string;
    email?: string;
    password?: string;
    fullName?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const mode = payload.mode === "signup" ? "signup" : "signin";
  const email = (payload.email ?? "").trim().toLowerCase();
  const password = (payload.password ?? "").trim();
  const fullName = (payload.fullName ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  if (mode === "signup") {
    if (fullName.length < 2) {
      return NextResponse.json({ ok: false, error: "Please enter your full name." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "That email already has an account — sign in instead." },
        { status: 409 },
      );
    }

    const [customer] = await db
      .insert(customers)
      .values({ email, fullName, passwordHash: hashPassword(password) })
      .returning();

    await createCustomerSession(customer.id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, mode, name: customer.fullName });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);

  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    return NextResponse.json(
      { ok: false, error: "That email and password do not match." },
      { status: 401 },
    );
  }

  await createCustomerSession(customer.id);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, mode, name: customer.fullName });
}

export async function DELETE() {
  const { destroyCustomerSession } = await import("@/lib/customer-auth");
  await destroyCustomerSession();
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
