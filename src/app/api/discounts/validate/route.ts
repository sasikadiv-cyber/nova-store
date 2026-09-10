import { NextResponse } from "next/server";

import { evaluateDiscount } from "@/lib/discounts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { code?: string; items?: { slug?: string; quantity?: number }[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid request." }, { status: 400 });
  }

  const code = (payload.code ?? "").toString();
  const items = (payload.items ?? [])
    .filter((item) => typeof item.slug === "string" && Number(item.quantity) > 0)
    .map((item) => ({ slug: String(item.slug), quantity: Number(item.quantity) }));

  if (!code.trim()) {
    return NextResponse.json({ ok: false, reason: "Enter a promotional code." }, { status: 400 });
  }

  try {
    const result = await evaluateDiscount(code, items);
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      code: result.codeText,
      label: result.code.label,
      summary: result.summary,
      discountCents: result.discountCents,
      eligibleUnits: result.eligibleUnits,
    });
  } catch (error) {
    console.error("[nova] discount validation failed", error);
    return NextResponse.json(
      { ok: false, reason: "Could not check that code right now." },
      { status: 500 },
    );
  }
}
