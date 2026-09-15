import { revalidateTag, unstable_cache as nextCache } from "next/cache";

/**
 * A data cache for the catalogue, with tags so writes can invalidate it
 * precisely instead of waiting for a time-based expiry.
 *
 * Why this stays real-time safe:
 *
 *  1. Every console save calls `invalidateCatalogue()` (see `refreshStore`),
 *     so a product, price, collection or appearance change is visible on the
 *     very next request — no TTL to wait out.
 *  2. Money and stock are never trusted from a cached page: `createOrder()`
 *     re-reads the catalogue, re-validates stock and recomputes the total on
 *     the server, so a stale display can never cause an oversell or a wrong
 *     charge.
 *  3. Order placement invalidates the stock tags for exactly the products
 *     that were bought, so availability updates straight after a sale.
 *  4. Anything that must reflect instantly and is cheap to read — admin and
 *     account pages, order status — is not cached at all.
 */

export const TAGS = {
  catalogue: "nova:catalogue",
  collections: "nova:collections",
  facets: "nova:facets",
  reviews: "nova:reviews",
  pages: "nova:pages",
  appearance: "nova:appearance",
  currency: "nova:currency",
  stats: "nova:stats",
  orders: "nova:orders",
} as const;

/** Tag for one product's page data (name, price, images, story). */
export const productTag = (slug: string) => `nova:product:${slug}`;

/** Tag for one product's live availability. */
export const stockTag = (productId: number) => `nova:stock:${productId}`;

/**
 * Wraps a read in Next's tagged cache.
 *
 * `keyParts` must contain every argument the read depends on, so two different
 * slugs never share a cache entry.
 */
export function cached<T>(
  keyParts: string[],
  tags: string[],
  fn: () => Promise<T>,
  revalidate = 300,
): () => Promise<T> {
  return nextCache(fn, keyParts, { tags, revalidate });
}

/* Next.js 16 wants the cache-life profile that the entry was written with, so
   every invalidation passes "max" — the widest of the default profiles, which
   matches the entries created by `cached()` below. */
const PROFILE = "max";

function drop(...tags: string[]) {
  for (const tag of tags) revalidateTag(tag, PROFILE);
}

/** Everything a console save could have touched. */
export function invalidateCatalogue() {
  drop(
    TAGS.catalogue,
    TAGS.collections,
    TAGS.facets,
    TAGS.reviews,
    TAGS.pages,
    TAGS.appearance,
    TAGS.currency,
    TAGS.stats,
  );
}

/** A single product was edited — drop its page and any lists it appears in. */
export function invalidateProduct(slug: string) {
  drop(productTag(slug), TAGS.catalogue, TAGS.collections, TAGS.facets, TAGS.stats);
}

/** Stock changed — only the affected product's availability. */
export function invalidateStock(productId: number) {
  drop(stockTag(productId), TAGS.catalogue, TAGS.stats);
}
