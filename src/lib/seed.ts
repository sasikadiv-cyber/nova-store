import { sql } from "drizzle-orm";

import { db } from "@/db";
import { collections, products, reviews } from "@/db/schema";
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
