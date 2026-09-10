import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { discountCodes, products, type DiscountCode } from "@/db/schema";

export type BagItem = { slug: string; quantity: number };

export type DiscountEvaluation =
  | {
      ok: true;
      code: DiscountCode;
      codeText: string;
      discountCents: number;
      eligibleSubtotalCents: number;
      eligibleUnits: number;
      summary: string;
    }
  | { ok: false; reason: string };

const MAX_PERCENT = 70;

function normalise(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function describeScope(code: DiscountCode) {
  switch (code.scope) {
    case "category":
      return `${code.scopeValue} only`;
    case "collection":
      return `${code.scopeValue} collection`;
    case "product":
      return `a single style`;
    default:
      return "entire store";
  }
}

export function describeCode(code: DiscountCode) {
  const amount =
    code.type === "percent" ? `${code.value}% off` : `$${(code.value / 100).toFixed(2)} off`;
  return `${amount} · ${describeScope(code)}`;
}

export function codeStatus(code: DiscountCode, now = new Date()) {
  if (!code.active) return "inactive" as const;
  if (code.startsAt && new Date(code.startsAt) > now) return "scheduled" as const;
  if (code.endsAt && new Date(code.endsAt) < now) return "expired" as const;
  if (code.maxRedemptions !== null && code.redeemedCount >= code.maxRedemptions)
    return "fully redeemed" as const;
  return "active" as const;
}

/**
 * Single source of truth for pricing a bag with a promotional code.
 * Used by the storefront bag, the checkout review step and the order writer,
 * so a code can never be applied client-side with a value the server disagrees with.
 */
export async function evaluateDiscount(rawCode: string, items: BagItem[]): Promise<DiscountEvaluation> {
  const codeText = normalise(rawCode);
  if (!codeText) return { ok: false, reason: "Enter a promotional code." };

  const cleanItems = items
    .filter((item) => item.slug && item.quantity > 0)
    .slice(0, 40)
    .map((item) => ({ slug: item.slug, quantity: Math.min(10, Math.round(item.quantity)) }));

  if (cleanItems.length === 0) {
    return { ok: false, reason: "Your bag is empty." };
  }

  const [code] = await db
    .select()
    .from(discountCodes)
    .where(sql`upper(${discountCodes.code}) = ${codeText}`)
    .limit(1);

  if (!code) return { ok: false, reason: "That code doesn't exist." };

  const status = codeStatus(code);
  if (status === "inactive") return { ok: false, reason: "That code is currently switched off." };
  if (status === "scheduled")
    return { ok: false, reason: "That code hasn't started yet." };
  if (status === "expired") return { ok: false, reason: "That code has expired." };
  if (status === "fully redeemed")
    return { ok: false, reason: "That code has reached its redemption limit." };

  const rows = await db
    .select({
      slug: products.slug,
      priceCents: products.priceCents,
      category: products.category,
      collectionSlug: products.collectionSlug,
    })
    .from(products)
    .where(inArray(products.slug, [...new Set(cleanItems.map((item) => item.slug))]));

  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  let eligibleSubtotalCents = 0;
  let eligibleUnits = 0;

  for (const item of cleanItems) {
    const product = bySlug.get(item.slug);
    if (!product) continue;

    const eligible =
      code.scope === "all" ||
      (code.scope === "category" && product.category === code.scopeValue) ||
      (code.scope === "collection" && product.collectionSlug === code.scopeValue) ||
      (code.scope === "product" && product.slug === code.scopeValue);

    if (!eligible) continue;

    eligibleSubtotalCents += product.priceCents * item.quantity;
    eligibleUnits += item.quantity;
  }

  if (eligibleUnits === 0) {
    return {
      ok: false,
      reason: `This code applies to ${describeScope(code)} — nothing in your bag qualifies.`,
    };
  }

  const subtotalCents = cleanItems.reduce((total, item) => {
    const product = bySlug.get(item.slug);
    return total + (product ? product.priceCents * item.quantity : 0);
  }, 0);

  if (code.minSubtotalCents > 0 && subtotalCents < code.minSubtotalCents) {
    return {
      ok: false,
      reason: `Spend $${(code.minSubtotalCents / 100).toFixed(0)} or more to use this code.`,
    };
  }

  let discountCents =
    code.type === "percent"
      ? Math.round((eligibleSubtotalCents * Math.min(MAX_PERCENT, code.value)) / 100)
      : code.value;

  discountCents = Math.max(0, Math.min(discountCents, subtotalCents));

  if (discountCents === 0) {
    return { ok: false, reason: "That code gives no discount on this bag." };
  }

  return {
    ok: true,
    code,
    codeText: code.code,
    discountCents,
    eligibleSubtotalCents,
    eligibleUnits,
    summary: describeCode(code),
  };
}

/** Called once an order is placed so redemption limits stay accurate. */
export async function recordRedemption(codeId: number) {
  await db
    .update(discountCodes)
    .set({ redeemedCount: sql`${discountCodes.redeemedCount} + 1` })
    .where(and(eq(discountCodes.id, codeId)));
}
