import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth";

import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  /* Writes to the catalogue, so it is owner-only — an open seeding endpoint
     lets anyone trigger database writes remotely. */
  await requireOwner();

  try {
    const result = await seedDatabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[nova] seed failed", error);
    return NextResponse.json({ ok: false, error: "Seeding failed." }, { status: 500 });
  }
}
