import { sql } from "drizzle-orm";

import { db } from "@/db";
import { collections, discountCodes, giftCards, products, reviews } from "@/db/schema";
import { seedCollections, seedProducts } from "./seed-data";

function average(values: number[]) {
  if (values.length === 0) return 5;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * Idempotent seeding: safe to call on every cold start.
 * Skips anything that has already been written.
 */
export async function seedDatabase() {
  await db
    .insert(collections)
    .values(
      seedCollections.map((collection) => ({
        slug: collection.slug,
        name: collection.name,
        tagline: collection.tagline,
        description: collection.description,
        image: collection.image,
        accent: collection.accent,
        sortOrder: collection.sortOrder,
      })),
    )
    .onConflictDoNothing({ target: collections.slug });

  const inserted = await db
    .insert(products)
    .values(
      seedProducts.map((product, index) => {
        const ratings = product.reviews.map((review) => review.rating);
        return {
          slug: product.slug,
          name: product.name,
          subtitle: product.subtitle,
          description: product.description,
          story: product.story,
          category: product.category,
          gender: product.gender,
          collectionSlug: product.collection,
          priceCents: Math.round(product.price * 100),
          compareAtCents: product.compareAt ? Math.round(product.compareAt * 100) : null,
          colors: product.colors,
          sizes: product.sizes,
          sizeType: product.sizeType,
          images: product.images,
          details: product.details,
          materials: product.materials,
          care: product.care,
          rating: average(ratings),
          reviewCount: product.reviews.length,
          stock: product.stock,
          badge: product.badge ?? null,
          isFeatured: product.featured ?? false,
          isNewArrival: product.newArrival ?? false,
          isBestSeller: product.bestSeller ?? false,
          createdAt: new Date(Date.now() - (seedProducts.length - index) * 36e5 * 9),
        };
      }),
    )
    .onConflictDoNothing({ target: products.slug })
    .returning({ id: products.id, slug: products.slug });

  const idBySlug = new Map(inserted.map((row) => [row.slug, row.id]));
  if (idBySlug.size === 0) {
    return { products: 0, reviews: 0 };
  }

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(reviews);

  if (count > 0) {
    return { products: idBySlug.size, reviews: 0 };
  }

  const reviewRows = seedProducts.flatMap((product) => {
    const productId = idBySlug.get(product.slug);
    if (!productId) return [];
    return product.reviews.map((review, reviewIndex) => ({
      productId,
      author: review.author,
      location: review.location,
      rating: review.rating,
      title: review.title,
      body: review.body,
      verified: true,
      createdAt: new Date(Date.now() - (reviewIndex + 1) * 864e5 * (3 + Math.round(Math.random() * 40))),
    }));
  });

  if (reviewRows.length > 0) {
    await db.insert(reviews).values(reviewRows);
  }

  return { products: idBySlug.size, reviews: reviewRows.length };
}

/**
 * Demo promotional codes and a demo gift card, so discount features work on a
 * fresh deployment without manual console setup. Idempotent and independent
 * of the catalogue seed — a store that already has products still gets these.
 */
export async function seedStoreExtras() {
  await db
    .insert(discountCodes)
    .values([
      {
        code: "WELCOME10",
        label: "Welcome offer — 10% off your first order",
        type: "percent",
        value: 10,
        scope: "all",
        minSubtotalCents: 0,
      },
      {
        code: "ATELIER20",
        label: "Atelier preview — 20% off orders over $200",
        type: "percent",
        value: 20,
        scope: "all",
        minSubtotalCents: 20000,
      },
    ])
    .onConflictDoNothing({ target: discountCodes.code });

  await db
    .insert(giftCards)
    .values([
      {
        code: "NOVA-GIFT-5000",
        initialCents: 5000,
        balanceCents: 5000,
        note: "Demo gift card",
      },
    ])
    .onConflictDoNothing({ target: giftCards.code });
}
