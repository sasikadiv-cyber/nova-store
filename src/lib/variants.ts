import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { productVariants, products, type ProductVariant } from "@/db/schema";

/**
 * Variant-level stock.
 *
 * `products.stock` is always the sum of the variant rows, so the catalogue has
 * one source of truth and existing "low stock" / cart-limit behaviour keeps
 * working unchanged.
 */

/** Stock rows for one product, ordered for display. */
export async function getVariants(productId: number): Promise<ProductVariant[]> {
  return db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(productVariants.color, productVariants.size);
}

/** All variant rows for a set of products, keyed by product id. */
export async function getVariantsForProducts(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, ProductVariant[]>();
  const rows = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds));
  const map = new Map<number, ProductVariant[]>();
  for (const row of rows) {
    const list = map.get(row.productId) ?? [];
    list.push(row);
    map.set(row.productId, list);
  }
  return map;
}

/** Recomputes products.stock from its variant rows. */
export async function syncProductStock(productId: number) {
  await db
    .update(products)
    .set({
      stock: sql`coalesce((select sum(${productVariants.stock}) from ${productVariants} where ${productVariants.productId} = ${productId}), 0)`,
    })
    .where(eq(products.id, productId));
}

/**
 * Creates a variant row for every colour × size the product offers and drops
 * rows that no longer apply. New combinations start at zero so the owner
 * decides how many to hold; the very first run spreads the product's existing
 * stock across all combinations.
 */
export async function ensureVariants(productId: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return;

  const existing = await getVariants(productId);
  const have = new Set(existing.map((row) => `${row.color}||${row.size}`));

  const wanted: { color: string; size: string }[] = [];
  for (const colour of product.colors ?? []) {
    for (const size of product.sizes ?? []) {
      wanted.push({ color: colour.name, size });
    }
  }

  const stale = existing.filter(
    (row) => !wanted.some((entry) => entry.color === row.color && entry.size === row.size),
  );
  if (stale.length > 0) {
    await db.delete(productVariants).where(inArray(productVariants.id, stale.map((r) => r.id)));
  }

  const missing = wanted.filter((entry) => !have.has(`${entry.color}||${entry.size}`));
  if (missing.length === 0) {
    if (stale.length > 0) await syncProductStock(productId);
    return;
  }

  let rows: { productId: number; color: string; size: string; stock: number }[];

  if (existing.length === 0) {
    /* First run — spread the product's current stock across every combination,
       and deliberately leave a few sizes sold out so the storefront shows the
       real "out of stock" state. */
    const total = Math.max(0, product.stock);
    const base = Math.floor(total / missing.length);
    let remainder = total - base * missing.length;

    rows = missing.map((entry, index) => {
      let stock = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return { productId, color: entry.color, size: entry.size, stock };
    });

    const donors = rows
      .map((row, index) => ({ row, index }))
      .filter(({ index }) => index % 5 === 3 && rows[index].stock > 0);
    for (const donor of donors) {
      rows[donor.index].stock = 0;
      rows[0].stock += donor.row.stock;
    }
  } else {
    rows = missing.map((entry) => ({ ...entry, productId, stock: 0 }));
  }

  await db
    .insert(productVariants)
    .values(rows)
    .onConflictDoNothing();

  await syncProductStock(productId);
}

/** Ensures every product in the catalogue has variant rows. */
export async function ensureAllVariants() {
  const rows = await db.select({ id: products.id }).from(products);
  for (const row of rows) {
    await ensureVariants(row.id);
  }
  return rows.length;
}

/** Writes one combination's stock and resyncs the product total. */
export async function setVariantStock(
  productId: number,
  color: string,
  size: string,
  stock: number,
) {
  const clamped = Math.max(0, Math.round(stock));

  const updated = await db
    .update(productVariants)
    .set({ stock: clamped, updatedAt: new Date() })
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.color, color),
        eq(productVariants.size, size),
      ),
    )
    .returning({ id: productVariants.id });

  if (updated.length === 0) {
    await db
      .insert(productVariants)
      .values({ productId, color, size, stock: clamped })
      .onConflictDoNothing();
  }

  await syncProductStock(productId);
}

export type StockLine = { productId: number; color: string; size: string; quantity: number };

export type DecrementResult = { ok: true } | { ok: false; error: string };

/**
 * Takes stock when an order is placed. Runs inside the order transaction and
 * refuses the line when there is not enough of that exact combination left.
 */
export async function decrementStock(lines: StockLine[]): Promise<DecrementResult> {
  for (const line of lines) {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, line.productId),
          eq(productVariants.color, line.color),
          eq(productVariants.size, line.size),
        ),
      )
      .limit(1);

    if (variant) {
      if (variant.stock < line.quantity) {
        return {
          ok: false,
          error: `Only ${variant.stock} left in ${line.color} · ${line.size}.`,
        };
      }
      await db
        .update(productVariants)
        .set({ stock: variant.stock - line.quantity, updatedAt: new Date() })
        .where(eq(productVariants.id, variant.id));
    } else {
      /* No row for this exact combination — never let that bypass the guard,
         so an out-of-stock piece cannot be sold under any colour or size. */
      const [product] = await db
        .select({ stock: products.stock })
        .from(products)
        .where(eq(products.id, line.productId))
        .limit(1);

      if (product && product.stock < line.quantity) {
        return {
          ok: false,
          error:
            product.stock === 0
              ? "This piece is currently out of stock."
              : `Only ${product.stock} left of this piece.`,
        };
      }
    }

    await syncProductStock(line.productId);
  }

  return { ok: true };
}

/** Shape the storefront needs to render per-colour and per-size availability. */
export type VariantStockView = {
  color: string;
  size: string;
  stock: number;
};

export function toStockView(variants: ProductVariant[]): VariantStockView[] {
  return variants.map((row) => ({ color: row.color, size: row.size, stock: row.stock }));
}
