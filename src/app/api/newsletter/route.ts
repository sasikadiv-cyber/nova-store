import { NextResponse } from "next/server";

import { db } from "@/db";
import { subscribers } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let email = "";
  try {
    const payload = (await request.json()) as { email?: string };
    email = (payload.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await db.insert(subscribers).values({ email }).onConflictDoNothing({ target: subscribers.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[nova] newsletter failed", error);
    return NextResponse.json({ ok: false, error: "Could not subscribe right now." }, { status: 500 });
  }
}
