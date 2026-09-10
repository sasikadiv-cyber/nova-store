"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  collections,
  discountCodes,
  orderEvents,
  orderItems,
  orders,
  products,
  reviews,
  type ColorOption,
} from "@/db/schema";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
  verifyCredentials,
} from "@/lib/auth";
import { slugify } from "@/lib/product-form";
import { ORDER_FLOW } from "@/lib/customer-queries";

/* ------------------------------------------------------------------ helpers */

function text(form: FormData, key: string, fallback = "") {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function numeric(form: FormData, key: string, fallback = 0) {
  const value = Number(text(form, key));
  return Number.isFinite(value) ? value : fallback;
}

function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function list(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}



function refreshStore() {
  revalidatePath("/", "layout");
}

/* --------------------------------------------------------------------- auth */

export async function loginAction(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");

  if (!verifyCredentials(email, password)) {
    redirect("/admin?error=1");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin");
}

/* ----------------------------------------------------------------- products */

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db.delete(products).where(eq(products.id, id));
  }
  refreshStore();
  redirect("/admin/products?deleted=1");
}

export async function updateStockAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const stock = Math.max(0, Math.round(numeric(formData, "stock", 0)));
  if (id > 0) {
    await db.update(products).set({ stock }).where(eq(products.id, id));
  }
  refreshStore();
  redirect("/admin/products?saved=1");
}

export async function toggleFlagAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const field = text(formData, "field");

  const allowed = {
    isFeatured: products.isFeatured,
    isNewArrival: products.isNewArrival,
    isBestSeller: products.isBestSeller,
  } as const;

  const column = allowed[field as keyof typeof allowed];
  if (id > 0 && column) {
    await db
      .update(products)
      .set({ [field]: sql`not ${column}` })
      .where(eq(products.id, id));
  }
  refreshStore();
  redirect("/admin/products?saved=1");
}

/** Sitewide / per-category discount tool.
 *  mode = apply    → move the current price into compare-at, then reduce it
 *  mode = clear    → keep the current price, drop the sale badge
 *  mode = restore  → roll back to the compare-at price
 */
export async function applyDiscountAction(formData: FormData) {
  await requireAdmin();
  const mode = text(formData, "mode", "apply");
  const category = text(formData, "category");
  const scope = category ? eq(products.category, category) : undefined;

  if (mode === "clear") {
    await db
      .update(products)
      .set({ compareAtCents: null })
      .where(scope ?? sql`true`);
    refreshStore();
    redirect("/admin/products?cleared=1");
  }

  if (mode === "restore") {
    await db
      .update(products)
      .set({
        priceCents: sql`${products.compareAtCents}`,
        compareAtCents: null,
      })
      .where(scope ? sql`${products.compareAtCents} is not null and ${scope}` : sql`${products.compareAtCents} is not null`);
    refreshStore();
    redirect("/admin/products?restored=1");
  }

  const percent = Math.min(70, Math.max(0, numeric(formData, "percent", 0)));
  if (percent <= 0) {
    redirect("/admin/products?cleared=1");
  }

  /* percent is clamped to 0-70 above, so inlining it as a literal is safe and
     keeps Postgres from inferring an integer parameter (round(int) is invalid). */
  const factor = sql.raw((1 - percent / 100).toFixed(4));
  const patch = {
    compareAtCents: sql`${products.priceCents}`,
    priceCents: sql`round(${products.priceCents} * ${factor})::int`,
  };

  if (category) {
    await db.update(products).set(patch).where(eq(products.category, category));
  } else {
    await db.update(products).set(patch);
  }

  refreshStore();
  redirect("/admin/products?discount=1");
}

/* -------------------------------------------------------------- collections */

export async function saveCollectionAction(formData: FormData) {
  await requireAdmin();

  const id = numeric(formData, "id", 0);
  const name = text(formData, "name") || "New collection";

  const values = {
    slug: slugify(text(formData, "slug") || name),
    name,
    tagline: text(formData, "tagline"),
    description: text(formData, "description"),
    image:
      text(formData, "image") ||
      "https://images.pexels.com/photos/30569741/pexels-photo-30569741.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500",
    accent: text(formData, "accent") || "#17150f",
    sortOrder: Math.round(numeric(formData, "sortOrder", 99)),
  };

  if (id > 0) {
    await db.update(collections).set(values).where(eq(collections.id, id));
  } else {
    await db.insert(collections).values(values);
  }

  refreshStore();
  redirect("/admin/collections?saved=1");
}

/* ------------------------------------------------------------------- orders */

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const status = text(formData, "status") || "confirmed";
  const note = text(formData, "note");
  const tracking = text(formData, "tracking");

  if (id <= 0) redirect("/admin/orders");

  await db
    .update(orders)
    .set({
      status,
      ...(tracking ? { trackingNumber: tracking } : {}),
    })
    .where(eq(orders.id, id));

  /* Every change becomes a tracking step the client sees in their account. */
  await db.insert(orderEvents).values({
    orderId: id,
    status,
    note:
      note ||
      ORDER_FLOW.find((step) => step.id === status)?.blurb ||
      "Status updated by the store.",
  });

  revalidatePath("/admin/orders");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  refreshStore();
  redirect("/admin/orders?saved=1");
}

export async function deleteOrderAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }
  revalidatePath("/admin/orders");
  redirect("/admin/orders?deleted=1");
}

/* ------------------------------------------------------------------ reviews */

export async function deleteReviewAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const productId = numeric(formData, "productId", 0);
  if (id > 0) {
    await db.delete(reviews).where(eq(reviews.id, id));
  }
  if (productId > 0) {
    const [agg] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
        avg: sql<number>`cast(coalesce(avg(${reviews.rating}), 5) as float)`,
      })
      .from(reviews)
      .where(eq(reviews.productId, productId));
    await db
      .update(products)
      .set({ reviewCount: agg?.count ?? 0, rating: Math.round((agg?.avg ?? 5) * 10) / 10 })
      .where(eq(products.id, productId));
  }
  refreshStore();
  redirect("/admin/reviews?deleted=1");
}

/* ------------------------------------------------------------ discount codes */

function toDate(form: FormData, key: string) {
  const raw = text(form, key);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `NOVA${out}`;
}

export async function saveDiscountAction(formData: FormData) {
  await requireAdmin();

  const id = numeric(formData, "id", 0);
  const rawCode = text(formData, "code").toUpperCase();
  const code = rawCode.replace(/[^A-Z0-9-]/g, "").slice(0, 20) || randomCode();
  const type = text(formData, "type") === "fixed" ? "fixed" : "percent";
  const scope = ["all", "category", "collection", "product"].includes(text(formData, "scope"))
    ? text(formData, "scope")
    : "all";

  const value =
    type === "percent"
      ? Math.min(70, Math.max(1, Math.round(numeric(formData, "value", 10))))
      : Math.max(1, Math.round(numeric(formData, "value", 10) * 100));

  const values = {
    code,
    label: text(formData, "label"),
    type,
    value,
    scope,
    scopeValue: scope === "all" ? "" : text(formData, "scopeValue"),
    minSubtotalCents: Math.max(0, Math.round(numeric(formData, "minSubtotal", 0) * 100)),
    maxRedemptions: numeric(formData, "maxRedemptions", 0) > 0
      ? Math.round(numeric(formData, "maxRedemptions", 0))
      : null,
    startsAt: toDate(formData, "startsAt"),
    endsAt: toDate(formData, "endsAt"),
    active: bool(formData, "active"),
  };

  if (id > 0) {
    await db.update(discountCodes).set(values).where(eq(discountCodes.id, id));
  } else {
    await db.insert(discountCodes).values(values).onConflictDoNothing({ target: discountCodes.code });
  }

  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?saved=1");
}

export async function toggleDiscountAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db
      .update(discountCodes)
      .set({ active: sql`not ${discountCodes.active}` })
      .where(eq(discountCodes.id, id));
  }
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?saved=1");
}

export async function deleteDiscountAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
  }
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?deleted=1");
}
