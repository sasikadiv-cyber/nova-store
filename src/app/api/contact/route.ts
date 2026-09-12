import { NextResponse } from "next/server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Stores a contact message for the console inbox. */
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

  let payload: { name?: string; email?: string; subject?: string; message?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const subject = (payload.subject ?? "").trim();
  const message = (payload.message ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Please tell us your name." }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Please write a little more so we can help." },
      { status: 400 },
    );
  }

  try {
    await db.insert(contactMessages).values({
      name: name.slice(0, 120),
      email: email.slice(0, 160),
      subject: subject.slice(0, 160),
      message: message.slice(0, 4000),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[nova] contact message failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not send your message right now." },
      { status: 500 },
    );
  }
}
