import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { evaluateDiscount } from "@/lib/discounts";
import { evaluateGiftCard } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

/** Checks a code at checkout — first as a promo code, then as a gift card. */
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
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        code: result.codeText,
        label: result.code.label,
        summary: result.summary,
        discountCents: result.discountCents,
        eligibleUnits: result.eligibleUnits,
      });
    }

    /* Not a promo code — maybe it is a gift card. */
    const slugs = [...new Set(items.map((item) => item.slug))];
    let subtotalCents = 0;
    if (slugs.length > 0) {
      const rows = await db
        .select({ slug: products.slug, priceCents: products.priceCents })
        .from(products)
        .where(inArray(products.slug, slugs));
      const bySlug = new Map(rows.map((row) => [row.slug, row.priceCents]));
      subtotalCents = items.reduce(
        (total, item) => total + (bySlug.get(item.slug) ?? 0) * item.quantity,
        0,
      );
    }

    const card = await evaluateGiftCard(code, subtotalCents);
    if (card.ok) {
      return NextResponse.json({
        ok: true,
        code: card.code,
        label: card.label,
        summary: card.summary,
        discountCents: card.maxRedeemCents,
        giftCard: true,
      });
    }

    return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
  } catch (error) {
    console.error("[nova] discount validation failed", error);
    return NextResponse.json(
      { ok: false, reason: "Could not check that code right now." },
      { status: 500 },
    );
  }
}
