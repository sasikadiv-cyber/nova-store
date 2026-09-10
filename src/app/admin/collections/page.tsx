import Image from "next/image";
import Link from "next/link";
import { asc, sql } from "drizzle-orm";

import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { saveCollectionAction } from "../actions";
import { SubmitButton } from "@/components/admin/submit-button";

export const dynamic = "force-dynamic";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

export default async function AdminCollections({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const rows = await db
    .select({
      collection: collections,
      productCount: sql<number>`cast((select count(*) from ${products} where ${products.collectionSlug} = ${collections.slug}) as int)`,
    })
    .from(collections)
    .orderBy(asc(collections.sortOrder));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-sage">Merchandising</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Collections</h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
            Names, taglines and cover imagery here drive the home page featured collections block,
            the navigation dropdown and the shop filters.
          </p>
        </div>
      </div>

      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Collection saved — the storefront has been updated.
        </p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {rows.map(({ collection, productCount }) => (
          <section key={collection.id} className="border border-sand bg-linen">
            <div className="flex gap-4 border-b border-sand p-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-bone-dark">
                <Image
                  src={collection.image}
                  alt={collection.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{collection.name}</p>
                <p className="mt-1 text-[12px] text-ink-300">{collection.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-300">
                  <span>/{collection.slug}</span>
                  <span>{productCount} products</span>
                  <span>order {collection.sortOrder}</span>
                </div>
              </div>
              <Link
                href={`/shop?collection=${collection.slug}`}
                className="link-underline shrink-0 self-start text-[11px] uppercase tracking-[0.14em] text-ink-300"
              >
                View
              </Link>
            </div>

            <form action={saveCollectionAction} className="space-y-4 p-4">
              <input type="hidden" name="id" value={collection.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>Name</span>
                  <input name="name" defaultValue={collection.name} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Tagline</span>
                  <input name="tagline" defaultValue={collection.tagline} className={field} />
                </label>
              </div>

              <label className="block">
                <span className={label}>Description</span>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={collection.description}
                  className={field}
                />
              </label>

              <label className="block">
                <span className={label}>Cover image URL</span>
                <input
                  name="image"
                  defaultValue={collection.image}
                  className={`${field} font-mono text-[12px]`}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className={label}>Slug</span>
                  <input name="slug" defaultValue={collection.slug} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Accent</span>
                  <input name="accent" defaultValue={collection.accent} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Sort order</span>
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={collection.sortOrder}
                    className={field}
                  />
                </label>
              </div>

              <SubmitButton
                label="Save collection"
                pendingLabel="Saving"
                className="bg-ink px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700"
              />
            </form>
          </section>
        ))}

        {/* ------------------------------------------------------- create */}
        <section className="border border-dashed border-brass/60 bg-linen p-4">
          <h2 className="text-xl">New collection</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
            Add a seasonal edit — it appears in the navigation dropdown and can be assigned to any
            product.
          </p>
          <form action={saveCollectionAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Name</span>
                <input name="name" required placeholder="The Resort Edit" className={field} />
              </label>
              <label className="block">
                <span className={label}>Tagline</span>
                <input name="tagline" placeholder="Linen and open weaves" className={field} />
              </label>
            </div>
            <label className="block">
              <span className={label}>Description</span>
              <textarea name="description" rows={3} className={field} />
            </label>
            <label className="block">
              <span className={label}>Cover image URL</span>
              <input name="image" className={`${field} font-mono text-[12px]`} />
            </label>
            <label className="block sm:w-40">
              <span className={label}>Sort order</span>
              <input name="sortOrder" type="number" defaultValue={99} className={field} />
            </label>
            <SubmitButton
              label="Create collection"
              pendingLabel="Creating"
              className="border border-ink px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
            />
          </form>
        </section>
      </div>
    </div>
  );
}
