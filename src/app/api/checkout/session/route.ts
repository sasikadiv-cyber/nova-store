import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { guard } from "@/lib/security";
import { createOrder, SHIPPING_METHODS, type ShippingMethodId } from "@/lib/queries";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Payload = {
  email?: string;
  fullName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  shippingMethod?: string;
  discountCode?: string;
  items?: { slug?: string; size?: string; color?: string; quantity?: number }[];
};

function origin(request: Request) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Starts a Stripe Checkout session.
 *
 * The order is written first in a `pending_payment` state — nothing is taken
 * from stock and no gift-card balance is spent — and the session id is kept
 * against it. Stock is only committed once Stripe confirms the charge.
 */
export async function POST(request: Request) {
  const blocked = guard(request, "checkout", 12, 600);
  if (blocked) return blocked;

  if (!stripeEnabled) {
    return NextResponse.json(
      { ok: false, error: "Card payments are not configured on this store yet." },
      { status: 503 },
    );
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  /* Re-read the customer so the order belongs to the signed-in client. */
  const { getCurrentCustomer } = await import("@/lib/customer-auth");
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Please sign in to place an order.", needsAuth: true },
      { status: 401 },
    );
  }

  const email = (payload.email ?? "").trim();
  const fullName = (payload.fullName ?? "").trim();
  const address1 = (payload.address1 ?? "").trim();
  const city = (payload.city ?? "").trim();
  const postalCode = (payload.postalCode ?? "").trim();
  const country = (payload.country ?? "").trim();

  if (!email || !fullName || !address1 || !city || !postalCode || !country) {
    return NextResponse.json({ ok: false, error: "Complete your delivery details." }, { status: 400 });
  }

  const items = (payload.items ?? [])
    .filter((item) => typeof item.slug === "string" && Number(item.quantity) > 0)
    .map((item) => ({
      slug: String(item.slug),
      size: String(item.size ?? ""),
      color: String(item.color ?? ""),
      quantity: Number(item.quantity),
    }));

  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Your bag is empty." }, { status: 400 });
  }

  const methodId = (
    payload.shippingMethod && payload.shippingMethod in SHIPPING_METHODS
      ? payload.shippingMethod
      : "standard"
  ) as ShippingMethodId;

  /* Everything the client sent is re-priced on the server. */
  const order = await createOrder(
    {
      email,
      fullName,
      address1,
      address2: (payload.address2 ?? "").trim(),
      city,
      region: (payload.region ?? "").trim(),
      postalCode,
      country,
      phone: (payload.phone ?? "").trim(),
      shippingMethod: methodId,
      discountCode: (payload.discountCode ?? "").trim(),
      customerId: customer.id,
      items,
    },
    { pending: true },
  );

  if (!order.ok) {
    return NextResponse.json({ ok: false, error: order.error }, { status: 400 });
  }

  const stripe = getStripe();
  const base = origin(request);

  try {
    /* The newest Checkout Sessions API with the Elements integration: Stripe
       supplies the payment form (cards, wallets, local methods, adaptive
       pricing) as embeddable elements, so the storefront can restyle every
       pixel to match its own theme — unlike the fixed `embedded_page` UI.
       The amount is priced server-side, so the client can never change it. */
    const session = await stripe.checkout.sessions.create({
      ui_mode: "elements",
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: order.order.totalCents,
            product_data: {
              name: `NOVA order ${order.order.orderNumber}`,
              description: `${items.reduce((count, item) => count + item.quantity, 0)} item(s) · duties & taxes included`,
            },
          },
        },
      ],
      metadata: { orderId: String(order.order.id), orderNumber: order.order.orderNumber },
      payment_intent_data: {
        metadata: { orderId: String(order.order.id), orderNumber: order.order.orderNumber },
        receipt_email: email,
      },
      return_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    /* Remember which session is paying for this order. */
    await db
      .update(orders)
      .set({ trackingNumber: `stripe:${session.id}` })
      .where(eq(orders.id, order.order.id));

    if (!session.client_secret) {
      throw new Error("Stripe did not issue a client secret.");
    }

    return NextResponse.json({
      ok: true,
      clientSecret: session.client_secret,
      orderId: order.order.id,
    });
  } catch (error) {
    console.error("[nova] checkout session failed", error);
    /* Leave the order pending; the client can retry. */
    return NextResponse.json(
      { ok: false, error: "Could not start the payment. Please try again." },
      { status: 502 },
    );
  }
}
