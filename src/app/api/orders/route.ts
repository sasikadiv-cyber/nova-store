import { NextResponse } from "next/server";

import { guard } from "@/lib/security";
import { revalidatePath } from "next/cache";

import { createOrder, type ShippingMethodId } from "@/lib/queries";
import { getCurrentCustomer } from "@/lib/customer-auth";

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

const METHOD_IDS = ["standard", "express", "priority"];

export async function POST(request: Request) {
  /* Orders are created by /api/checkout/session and confirmed by Stripe.
   * This handler is kept only so an old bookmark gets a clear answer. */
  return Response.json(
    { ok: false, error: "Checkout runs through Stripe. Start from the bag." },
    { status: 410 },
  );
}

async function unusedPost(request: Request) {
  const blocked = guard(request, "order", 12, 600);
  if (blocked) return blocked;

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim();
  const fullName = (payload.fullName ?? "").trim();
  const address1 = (payload.address1 ?? "").trim();
  const city = (payload.city ?? "").trim();
  const postalCode = (payload.postalCode ?? "").trim();
  const country = (payload.country ?? "").trim();

  const errors: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("a valid email");
  if (fullName.length < 2) errors.push("your full name");
  if (address1.length < 4) errors.push("a street address");
  if (city.length < 2) errors.push("a city");
  if (postalCode.length < 2) errors.push("a postal code");
  if (country.length < 2) errors.push("a country");

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Please provide ${errors.join(", ")}.` },
      { status: 400 },
    );
  }

  const items = (payload.items ?? [])
    .filter((item) => typeof item.slug === "string" && item.slug.length > 0)
    .map((item) => ({
      slug: String(item.slug),
      size: String(item.size ?? ""),
      color: String(item.color ?? ""),
      quantity: Number(item.quantity ?? 1),
    }));

  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Your bag is empty." }, { status: 400 });
  }

  const shippingMethod = (
    METHOD_IDS.includes(payload.shippingMethod ?? "") ? payload.shippingMethod : "standard"
  ) as ShippingMethodId;

  /* Placing an order requires a signed-in account. Enforced on the server so
     the rule cannot be bypassed by calling this endpoint directly. */
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Please sign in to place an order.", needsAuth: true },
      { status: 401 },
    );
  }

  try {
    const result = await createOrder({
      email,
      fullName,
      address1,
      address2: (payload.address2 ?? "").trim(),
      city,
      region: (payload.region ?? "").trim(),
      postalCode,
      country,
      phone: (payload.phone ?? "").trim(),
      customerId: customer.id,
      shippingMethod,
      discountCode: (payload.discountCode ?? "").trim(),
      items,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    /* Drop the rendered catalogue so the new stock levels show immediately. */
    revalidatePath("/", "layout");

    return NextResponse.json({
      ok: true,
      orderNumber: result.order.orderNumber,
      totalCents: result.order.totalCents,
      itemCount: result.items.reduce((total, item) => total + item.quantity, 0),
    });
  } catch (error) {
    console.error("[nova] order failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not place your order. Please try again." },
      { status: 500 },
    );
  }
}
