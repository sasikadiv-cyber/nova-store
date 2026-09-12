import Link from "next/link";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { ProductForm } from "@/components/admin/product-form";
import { formatUsd } from "@/lib/currency";
import { requireManagerPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManagerPage();
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) return null;

  const [[product], allCollections] = await Promise.all([
    db.select().from(products).where(eq(products.id, productId)).limit(1),
    db.select().from(collections).orderBy(asc(collections.sortOrder)),
  ]);

  /* A deleted or unknown product renders a message rather than throwing, so a
     stale tab or bookmark never triggers a Server Components render error. */
  if (!product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
        <p className="eyebrow text-sage">Not found</p>
        <h1 className="text-[clamp(1.9rem,4vw,2.8rem)]">That piece no longer exists</h1>
        <p className="max-w-md text-[13.5px] leading-relaxed text-ink-300">
          It may have been deleted from the catalogue. Pick another style to edit, or create a new
          one.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin/products"
            className="bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
          >
            All products
          </Link>
          <Link
            href="/admin/products/new"
            className="border border-ink/15 px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-bone"
          >
            Add a product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-sage">Editing</p>
          <h1 className="mt-3 text-[clamp(1.9rem,3.6vw,2.8rem)]">{product.name}</h1>
          <p className="mt-2 text-[13px] text-ink-300">
            {formatUsd(product.priceCents)} · {product.stock} in stock · {product.reviewCount} reviews
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
          >
            View live page
          </Link>
          <Link
            href="/admin/products"
            className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
          >
            All products
          </Link>
        </div>
      </div>
      <ProductForm product={product} collections={allCollections} />
    </div>
  );
}
