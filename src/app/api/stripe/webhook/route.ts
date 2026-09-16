import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { fulfilOrder } from "@/lib/queries";
import { constructWebhookEvent, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. This is the authoritative confirmation: it fires even if the
 * client never reaches the success page (closed tab, lost connection), so the
 * order is still fulfilled. Signature is verified with STRIPE_WEBHOOK_SECRET,
 * and fulfilment is idempotent so a replay cannot double-charge stock.
 */
export async function POST(request: Request) {
  if (!stripeEnabled) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const payload = await request.text();

  const event = constructWebhookEvent(payload, signature);
  if (!event) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as { id: string; payment_status?: string; metadata?: Record<string, string> };

    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      const orderId = Number(session.metadata?.orderId ?? 0);
      if (orderId) {
        await fulfilOrder(orderId);
      }
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as { metadata?: Record<string, string> };
    const orderId = Number(session.metadata?.orderId ?? 0);
    if (orderId) {
      /* Never paid — release it so the client can try again. */
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (order?.status === "pending_payment") {
        await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
      }
    }
  }

  return NextResponse.json({ received: true });
}
