import { NextResponse } from "next/server";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fulfilOrder } from "@/lib/queries";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * The success-page redirect lands here. The session is read back from Stripe
 * and the order is only fulfilled when Stripe reports it paid — the client
 * cannot confirm its own order.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!sessionId) {
    return NextResponse.json({ ok: false, paid: false, error: "Missing session." }, { status: 400 });
  }
  if (!stripeEnabled) {
    return NextResponse.json({ ok: false, paid: false, error: "Payments not configured." }, { status: 503 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.status === "complete";

    if (!paid) {
      return NextResponse.json({ ok: true, paid: false, status: session.payment_status });
    }

    const orderId = Number(session.metadata?.orderId ?? 0);
    if (!orderId) {
      return NextResponse.json({ ok: false, paid: false, error: "Order not found." }, { status: 404 });
    }

    const result = await fulfilOrder(orderId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, paid: false, error: result.error }, { status: 409 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    return NextResponse.json({
      ok: true,
      paid: true,
      orderNumber: order?.orderNumber ?? "",
      totalCents: order?.totalCents ?? 0,
      email: order?.email ?? "",
    });
  } catch (error) {
    console.error("[nova] verify session failed", error);
    return NextResponse.json({ ok: false, paid: false, error: "Could not verify payment." }, { status: 502 });
  }
}
