import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { ProductForm } from "@/components/admin/product-form";
import { formatUsd } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const [[product], allCollections] = await Promise.all([
    db.select().from(products).where(eq(products.id, productId)).limit(1),
    db.select().from(collections).orderBy(asc(collections.sortOrder)),
  ]);

  if (!product) notFound();

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
