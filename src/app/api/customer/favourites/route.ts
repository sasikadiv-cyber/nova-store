import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { favourites, products } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/** The client's saved pieces — ids for the storefront, full rows for the account. */
export async function GET(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ ok: true, ids: [], products: [] });
  }

  const url = new URL(request.url);
  const full = url.searchParams.get("full") === "1";

  const rows = await db
    .select({
      productId: favourites.productId,
      slug: products.slug,
      name: products.name,
      subtitle: products.subtitle,
      priceCents: products.priceCents,
      compareAtCents: products.compareAtCents,
      image: sql<string>`${products.images}->>0`,
      stock: products.stock,
      rating: products.rating,
      reviewCount: products.reviewCount,
    })
    .from(favourites)
    .innerJoin(products, eq(products.id, favourites.productId))
    .where(eq(favourites.customerId, customer.id))
    .orderBy(desc(favourites.createdAt));

  return NextResponse.json({
    ok: true,
    ids: rows.map((row) => row.productId),
    products: full ? rows : undefined,
  });
}

/** Toggles one piece on the wishlist. */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Sign in to save pieces to your wishlist.", needsAuth: true },
      { status: 401 },
    );
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

  let payload: { productId?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const productId = Number(payload.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: favourites.id })
    .from(favourites)
    .where(and(eq(favourites.customerId, customer.id), eq(favourites.productId, productId)))
    .limit(1);

  if (existing) {
    await db.delete(favourites).where(eq(favourites.id, existing.id));
    revalidatePath("/account/favourites");
    return NextResponse.json({ ok: true, saved: false });
  }

  await db.insert(favourites).values({ customerId: customer.id, productId }).onConflictDoNothing();
  revalidatePath("/account/favourites");
  return NextResponse.json({ ok: true, saved: true });
}
