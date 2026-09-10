import { NextResponse } from "next/server";

import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[nova] seed failed", error);
    return NextResponse.json({ ok: false, error: "Seeding failed." }, { status: 500 });
  }
}
