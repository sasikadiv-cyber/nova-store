import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  collections,
  orderEvents,
  orderItems,
  orders,
  products,
  reviews,
  type Product,
} from "@/db/schema";
import { evaluateDiscount, recordRedemption } from "./discounts";
import { decrementStock } from "./variants";
import { seedDatabase } from "./seed";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "rating" | "best-selling";

export type ProductFilters = {
  categories?: string[];
  genders?: string[];
  sizes?: string[];
  families?: string[];
  collection?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  sort?: SortKey;
};

export type Facets = {
  categories: { name: string; count: number }[];
  genders: { name: string; count: number }[];
  sizes: string[];
  families: { name: string; count: number }[];
  priceMin: number;
  priceMax: number;
  total: number;
};

let seedPromise: Promise<void> | null = null;

/** Guarantees the storefront has catalog data, even on a brand new database. */
export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const [{ count } = { count: 0 }] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(products);
        if (count === 0) {
          await seedDatabase();
        }
      } catch (error) {
        console.error("[nova] seeding skipped:", error);
        seedPromise = null;
      }
    })();
  }
  return seedPromise;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
const SHOE_ORDER = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

function sortSizes(values: string[]) {
  return [...values].sort((a, b) => {
    const alpha = SIZE_ORDER.indexOf(a);
    const beta = SIZE_ORDER.indexOf(b);
    if (alpha !== -1 || beta !== -1) {
      return (alpha === -1 ? 99 : alpha) - (beta === -1 ? 99 : beta);
    }
    return Number(a) - Number(b);
  });
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  await ensureSeeded();

  const conditions: SQL[] = [];

  if (filters.categories?.length) {
    conditions.push(inArray(products.category, filters.categories));
  }
  if (filters.genders?.length) {
    conditions.push(inArray(products.gender, filters.genders));
  }
  if (filters.collection) {
    conditions.push(eq(products.collectionSlug, filters.collection));
  }
  if (filters.sizes?.length) {
    const sizeConditions = filters.sizes.map(
      (size) => sql`${products.sizes} @> ${JSON.stringify([size])}::jsonb`,
    );
    conditions.push(
      (sizeConditions.length === 1 ? sizeConditions[0] : or(...sizeConditions)) as SQL,
    );
  }
  if (filters.families?.length) {
    conditions.push(
      sql`exists (select 1 from jsonb_array_elements(${products.colors}) as c where c->>'family' = any(${sql.raw(
        `array[${filters.families.map((family) => `'${family.replace(/'/g, "''")}'`).join(",")}]::text[]`,
      )}))`,
    );
  }
  if (typeof filters.minPrice === "number") {
    conditions.push(gte(products.priceCents, Math.round(filters.minPrice * 100)));
  }
  if (typeof filters.maxPrice === "number") {
    conditions.push(lte(products.priceCents, Math.round(filters.maxPrice * 100)));
  }
  if (filters.onSale) {
    conditions.push(sql`${products.compareAtCents} is not null`);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.subtitle, term),
        ilike(products.category, term),
        ilike(products.description, term),
      ) as SQL,
    );
  }

  const orderBy = (() => {
    switch (filters.sort) {
      case "newest":
        return [desc(products.isNewArrival), desc(products.createdAt)];
      case "price-asc":
        return [asc(products.priceCents)];
      case "price-desc":
        return [desc(products.priceCents)];
      case "rating":
        return [desc(products.rating), desc(products.reviewCount)];
      case "best-selling":
        return [desc(products.reviewCount), desc(products.isBestSeller)];
      default:
        return [desc(products.isFeatured), desc(products.isBestSeller), asc(products.id)];
    }
  })();

  return db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...orderBy);
}

export async function getProductBySlug(slug: string) {
  await ensureSeeded();
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return product ?? null;
}

export async function getProductReviews(productId: number) {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
}

export async function getRelatedProducts(product: Product, limit = 4) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.category, product.category), sql`${products.id} <> ${product.id}`))
    .orderBy(desc(products.rating))
    .limit(limit);

  if (rows.length >= limit) return rows;

  const fallback = await db
    .select()
    .from(products)
    .where(sql`${products.id} <> ${product.id}`)
    .orderBy(desc(products.isBestSeller))
    .limit(limit);

  const seen = new Set(rows.map((row) => row.id));
  for (const row of fallback) {
    if (rows.length >= limit) break;
    if (!seen.has(row.id)) {
      rows.push(row);
      seen.add(row.id);
    }
  }
  return rows;
}

export async function getCollections() {
  await ensureSeeded();
  return db.select().from(collections).orderBy(asc(collections.sortOrder));
}

export async function getCollectionBySlug(slug: string) {
  const [row] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  return row ?? null;
}

export async function getFacets(): Promise<Facets> {
  await ensureSeeded();
  const rows = await db
    .select({
      category: products.category,
      gender: products.gender,
      sizes: products.sizes,
      colors: products.colors,
      priceCents: products.priceCents,
    })
    .from(products);

  const categories = new Map<string, number>();
  const genders = new Map<string, number>();
  const families = new Map<string, number>();
  const sizes = new Set<string>();
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;

  for (const row of rows) {
    categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
    genders.set(row.gender, (genders.get(row.gender) ?? 0) + 1);
    row.sizes.forEach((size) => sizes.add(size));
    for (const color of row.colors ?? []) {
      families.set(color.family, (families.get(color.family) ?? 0) + 1);
    }
    priceMin = Math.min(priceMin, row.priceCents);
    priceMax = Math.max(priceMax, row.priceCents);
  }

  return {
    categories: [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    genders: [...genders.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    sizes: sortSizes([...sizes]),
    families: [...families.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    priceMin: rows.length ? Math.floor(priceMin / 100) : 0,
    priceMax: rows.length ? Math.ceil(priceMax / 100) : 1000,
    total: rows.length,
  };
}

export async function getFeatured(limit = 8) {
  await ensureSeeded();
  return db
    .select()
    .from(products)
    .where(eq(products.isFeatured, true))
    .orderBy(desc(products.rating))
    .limit(limit);
}

export async function getNewArrivals(limit = 8) {
  await ensureSeeded();
  return db
    .select()
    .from(products)
    .where(eq(products.isNewArrival, true))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

export async function getBestSellers(limit = 8) {
  await ensureSeeded();
  return db
    .select()
    .from(products)
    .where(eq(products.isBestSeller, true))
    .orderBy(desc(products.reviewCount))
    .limit(limit);
}

export async function getStorefrontStats() {
  await ensureSeeded();
  const [row] = await db
    .select({
      products: sql<number>`cast(count(*) as int)`,
      reviews: sql<number>`cast((select count(*) from ${reviews}) as int)`,
      avgRating: sql<number>`cast(coalesce(avg(${products.rating}), 5) as float)`,
    })
    .from(products);
  return row ?? { products: 0, reviews: 0, avgRating: 5 };
}

/* ------------------------------------------------------------------ reviews */

export type ReviewInput = {
  slug: string;
  author: string;
  location?: string;
  rating: number;
  title: string;
  body: string;
};

export async function createReview(input: ReviewInput) {
  const product = await getProductBySlug(input.slug);
  if (!product) return { ok: false as const, error: "Product not found" };

  const [created] = await db
    .insert(reviews)
    .values({
      productId: product.id,
      author: input.author.slice(0, 80),
      location: (input.location ?? "").slice(0, 80),
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 1200),
      verified: false,
    })
    .returning();

  const [agg] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      avg: sql<number>`cast(avg(${reviews.rating}) as float)`,
    })
    .from(reviews)
    .where(eq(reviews.productId, product.id));

  await db
    .update(products)
    .set({ reviewCount: agg?.count ?? 1, rating: Math.round((agg?.avg ?? 5) * 10) / 10 })
    .where(eq(products.id, product.id));

  return { ok: true as const, review: created };
}

/* ------------------------------------------------------------------- orders */

export const SHIPPING_METHODS = {
  standard: { id: "standard", label: "Standard global", eta: "5–8 business days", cents: 1800, freeOver: 25000 },
  express: { id: "express", label: "Express (DHL)", eta: "2–4 business days", cents: 3200, freeOver: null },
  priority: { id: "priority", label: "Priority courier", eta: "Next business day", cents: 5800, freeOver: null },
} as const;

export type ShippingMethodId = keyof typeof SHIPPING_METHODS;

export type CartLineInput = { slug: string; size: string; color: string; quantity: number };

export type DiscountSummary = {
  code: string;
  label: string;
  discountCents: number;
  eligibleUnits: number;
};

export type OrderInput = {
  email: string;
  fullName: string;
  address1: string;
  address2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
  shippingMethod: ShippingMethodId;
  currency?: string;
  discountCode?: string;
  customerId?: number | null;
  items: CartLineInput[];
};

function orderNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NVA-${code}`;
}

export async function createOrder(input: OrderInput) {
  await ensureSeeded();

  const cleanItems = input.items
    .filter((item) => item.quantity > 0)
    .slice(0, 40)
    .map((item) => ({
      slug: item.slug,
      size: item.size ?? "",
      color: item.color ?? "",
      quantity: Math.min(10, Math.max(1, Math.round(item.quantity))),
    }));

  if (cleanItems.length === 0) {
    return { ok: false as const, error: "Your bag is empty." };
  }

  const slugs = [...new Set(cleanItems.map((item) => item.slug))];
  const catalog = await db.select().from(products).where(inArray(products.slug, slugs));
  const bySlug = new Map(catalog.map((product) => [product.slug, product]));

  const lines = cleanItems.flatMap((item) => {
    const product = bySlug.get(item.slug);
    if (!product) return [];
    return [
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0] ?? "",
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: product.priceCents * item.quantity,
      },
    ];
  });

  if (lines.length === 0) {
    return { ok: false as const, error: "Those items are no longer available." };
  }

  const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  const method = SHIPPING_METHODS[input.shippingMethod] ?? SHIPPING_METHODS.standard;
  const shippingCents = method.freeOver !== null && subtotalCents >= method.freeOver ? 0 : method.cents;

  /* Re-validate the promotional code on the server — never trust the client. */
  let discountCents = 0;
  let discountCode = "";
  let codeId: number | null = null;
  let discountSummary = "";

  if (input.discountCode) {
    const evaluation = await evaluateDiscount(
      input.discountCode,
      lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
    );
    if (evaluation.ok) {
      discountCents = Math.min(evaluation.discountCents, subtotalCents);
      discountCode = evaluation.codeText;
      codeId = evaluation.code.id;
      discountSummary = evaluation.summary;
    }
  }

  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  /* Take the stock before writing the order so an oversell is refused. */
  const taken = await decrementStock(
    lines.map((line) => ({
      productId: line.productId,
      color: line.color,
      size: line.size,
      quantity: line.quantity,
    })),
  );

  if (!taken.ok) {
    return { ok: false as const, error: taken.error };
  }

  const created = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: orderNumber(),
        email: input.email,
        fullName: input.fullName,
        address1: input.address1,
        address2: input.address2 ?? "",
        city: input.city,
        region: input.region ?? "",
        postalCode: input.postalCode,
        country: input.country,
        phone: input.phone ?? "",
        shippingMethod: method.id,
        customerId: input.customerId ?? null,
        currency: "USD",
        fxRate: 1,
        subtotalCents,
        shippingCents,
        taxCents: 0,
        discountCode,
        discountCents,
        totalCents,
        status: "confirmed",
      })
      .returning();

    await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
    await tx.insert(orderEvents).values({
      orderId: order.id,
      status: "confirmed",
      note: "We have your order and payment.",
    });
    return order;
  });

  if (codeId) {
    await recordRedemption(codeId);
  }

  return {
    ok: true as const,
    order: created,
    items: lines,
    discount: discountCents > 0
      ? { code: discountCode, discountCents, summary: discountSummary }
      : null,
  };
}

export async function getOrderByNumber(number: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, number)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { order, items };
}

export async function getRecentOrders(limit = 5) {
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}
