import { asc } from "drizzle-orm";

import { db } from "@/db";
import { collections } from "@/db/schema";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const allCollections = await db.select().from(collections).orderBy(asc(collections.sortOrder));

  return (
    <div>
      <p className="eyebrow text-sage">Catalogue</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Add a product</h1>
      <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
        Publish straight to the live storefront — it appears in the shop grid, filters and search
        the moment you save.
      </p>
      <ProductForm collections={allCollections} />
    </div>
  );
}
