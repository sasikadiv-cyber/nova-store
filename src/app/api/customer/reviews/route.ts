import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { orderItems, orders, products, reviews } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resyncProductRating } from "@/lib/customer-queries";

export const dynamic = "force-dynamic";

/**
 * Lets a signed-in client review a piece they actually received.
 *
 * The "verified purchase" check happens here on the server: the product must
 * appear on one of the customer's delivered orders. That is what turns the
 * review badge into something meaningful rather than a client-side claim.
 */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
    }
  }

  let payload: { productId?: number; rating?: number; title?: string; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const productId = Number(payload.productId);
  const rating = Math.round(Number(payload.rating));
  const title = (payload.title ?? "").trim();
  const body = (payload.body ?? "").trim();

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "Choose a rating from 1 to 5." }, { status: 400 });
  }
  if (title.length < 3) {
    return NextResponse.json({ ok: false, error: "Add a short headline." }, { status: 400 });
  }
  if (body.length < 10) {
    return NextResponse.json({ ok: false, error: "Tell us a little more (10+ characters)." }, { status: 400 });
  }

  const [product] = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return NextResponse.json({ ok: false, error: "That piece no longer exists." }, { status: 404 });
  }

  /* Verified purchase: this product must be on a delivered order of theirs. */
  const [delivered] = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.customerId, customer.id),
        eq(orders.status, "delivered"),
        eq(orderItems.productId, productId),
      ),
    )
    .limit(1);

  if (!delivered) {
    return NextResponse.json(
      { ok: false, error: "You can review a piece once it has been delivered." },
      { status: 403 },
    );
  }

  const [already] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.customerId, customer.id), eq(reviews.productId, productId)))
    .limit(1);

  if (already) {
    return NextResponse.json(
      { ok: false, error: "You have already reviewed this piece." },
      { status: 409 },
    );
  }

  const [review] = await db
    .insert(reviews)
    .values({
      productId,
      customerId: customer.id,
      author: customer.fullName,
      location: "",
      rating,
      title: title.slice(0, 120),
      body: body.slice(0, 1200),
      verified: true,
    })
    .returning();

  await resyncProductRating(productId);

  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath("/account/reviews");
  revalidatePath(`/products/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, review });
}
