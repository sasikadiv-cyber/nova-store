import { eq } from "drizzle-orm";

import { db } from "@/db";
import { giftCards } from "@/db/schema";
import { formatUsd } from "./currency";

export type GiftCardEvaluation =
  | {
      ok: true;
      code: string;
      label: string;
      summary: string;
      giftCardId: number;
      balanceCents: number;
      maxRedeemCents: number;
    }
  | { ok: false; reason: string };

/** Reads a gift card and works out how much of it this order can spend. */
export async function evaluateGiftCard(
  rawCode: string,
  subtotalCents: number,
): Promise<GiftCardEvaluation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a code." };

  const [card] = await db.select().from(giftCards).where(eq(giftCards.code, code)).limit(1);
  if (!card) return { ok: false, reason: "That code is not recognised." };
  if (!card.active) return { ok: false, reason: "That gift card is no longer active." };
  if (card.balanceCents <= 0) {
    return { ok: false, reason: "That gift card has no balance left." };
  }

  const amount = Math.min(card.balanceCents, Math.max(0, subtotalCents));
  if (amount <= 0) return { ok: false, reason: "Your bag is empty." };

  return {
    ok: true,
    code: card.code,
    label: "Gift card",
    summary: `Gift card · ${formatUsd(card.balanceCents)} balance, ${formatUsd(amount)} applied`,
    giftCardId: card.id,
    balanceCents: card.balanceCents,
    maxRedeemCents: amount,
  };
}

/** Spends from a gift card after the order is written. */
export async function redeemGiftCard(id: number, amountCents: number) {
  const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (!card) return;
  await db
    .update(giftCards)
    .set({ balanceCents: Math.max(0, card.balanceCents - amountCents), updatedAt: new Date() })
    .where(eq(giftCards.id, id));
}

/** A friendly, unguessable code such as NOVAGC-4K7Q2M. */
export function generateGiftCardCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let index = 0; index < 6; index += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NOVAGC-${body}`;
}
