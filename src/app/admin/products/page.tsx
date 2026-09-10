import Image from "next/image";
import Link from "next/link";
import { asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { formatUsd } from "@/lib/currency";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  applyDiscountAction,
  deleteProductAction,
  toggleFlagAction,
} from "../actions";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Outerwear",
  "Knitwear",
  "Footwear",
  "Dresses",
  "Tailoring",
  "Essentials",
];

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const category = typeof params.category === "string" ? params.category : "";

  const conditions: SQL[] = [];
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.slug, term)) as SQL);
  }
  if (category) {
    conditions.push(eq(products.category, category));
  }

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? sql.join(conditions, sql` and `) : undefined)
    .orderBy(desc(products.isFeatured), asc(products.name));

  const [collectionRows, categoryRows] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.sortOrder)),
    db
      .select({ category: products.category, count: sql<number>`cast(count(*) as int)` })
      .from(products)
      .groupBy(products.category)
      .orderBy(desc(sql`count(*)`)),
  ]);

  const totalStock = rows.reduce((total, row) => total + row.stock, 0);
  const retailValue = rows.reduce(
    (total, row) => total + row.priceCents * row.stock,
    0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-sage">Catalogue</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Products &amp; stock</h1>
          <p className="mt-3 text-[13px] text-ink-300">
            {rows.length} styles · {totalStock} units · {formatUsd(retailValue)} at retail
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-ink px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
        >
          + Add product
        </Link>
      </div>

      {/* --------------------------------------------------------- filters */}
      <form className="mt-8 flex flex-wrap items-end gap-3 border border-sand bg-linen p-4">
        <label className="min-w-[200px] flex-1">
          <span className="eyebrow text-ink-300">Search</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Name or slug…"
            className="mt-2 w-full border border-ink/15 bg-bone px-3 py-2 text-[13.5px] outline-none focus:border-ink"
          />
        </label>
        <label>
          <span className="eyebrow text-ink-300">Category</span>
          <select
            name="category"
            defaultValue={category}
            className="mt-2 w-full border border-ink/15 bg-bone px-3 py-2 text-[13.5px] outline-none focus:border-ink"
          >
            <option value="">All categories</option>
            {categoryRows.map((row) => (
              <option key={row.category} value={row.category}>
                {row.category} ({row.count})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="border border-ink px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
        >
          Filter
        </button>
        {(search || category) && (
          <Link
            href="/admin/products"
            className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            Clear
          </Link>
        )}
      </form>

      {/* ------------------------------------------------- discount engine */}
      <section className="mt-6 border border-sand bg-linen p-5">
        <h2 className="text-xl">Discount management</h2>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-300">
          Apply a percentage off a category — or the whole catalogue. The current price moves into
          the struck-through compare-at price, so badges and sale filters update automatically.
          Use restore to roll prices back to their pre-sale level.
        </p>
        <form action={applyDiscountAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label>
            <span className="eyebrow text-ink-300">Scope</span>
            <select
              name="category"
              className="mt-2 border border-ink/15 bg-bone px-3 py-2 text-[13.5px] outline-none focus:border-ink"
            >
              <option value="">Entire catalogue</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item} only
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="eyebrow text-ink-300">Percent off</span>
            <input
              name="percent"
              type="number"
              min={0}
              max={70}
              defaultValue={15}
              className="mt-2 w-28 border border-ink/15 bg-bone px-3 py-2 text-[13.5px] outline-none focus:border-ink"
            />
          </label>
          <SubmitButton
            label="Apply discount"
            pendingLabel="Applying"
            name="mode"
            value="apply"
            className="bg-ink px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700"
          />
          <SubmitButton
            label="Restore prices"
            pendingLabel="Restoring"
            name="mode"
            value="restore"
            className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
          />
          <SubmitButton
            label="Remove badges"
            pendingLabel="Removing"
            name="mode"
            value="clear"
            className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
          />
        </form>
      </section>

      {/* ---------------------------------------------------------- notices */}
      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Changes saved and live on the storefront.
        </p>
      )}
      {params.deleted && (
        <p className="mt-6 border-l-2 border-ember bg-linen px-4 py-3 text-[13px]">
          Product deleted.
        </p>
      )}
      {params.discount && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Discount applied — compare-at prices set and badges live.
        </p>
      )}
      {params.restored && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Prices rolled back to their pre-sale level.
        </p>
      )}
      {params.cleared && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Sale badges removed — current prices kept.
        </p>
      )}

      {/* ------------------------------------------------------------ table */}
      <div className="mt-6 overflow-x-auto border border-sand bg-linen">
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-sand text-[10.5px] uppercase tracking-[0.14em] text-ink-300">
              <th className="px-4 py-3 font-medium">Piece</th>
              <th className="px-3 py-3 font-medium">Pricing</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Home page</th>
              <th className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const discount =
                row.compareAtCents && row.compareAtCents > row.priceCents
                  ? Math.round(100 - (row.priceCents / row.compareAtCents) * 100)
                  : null;
              return (
                <tr key={row.id} className="border-b border-sand/70 align-top">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-bone-dark">
                        <Image
                          src={row.images[0] ?? ""}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${row.id}`}
                          className="link-underline flex items-center gap-1.5 text-[13.5px]"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            className="shrink-0 text-brass"
                            aria-hidden="true"
                          >
                            <path d="M4 20h4l10-10-4-4L4 16v4zM14 4l4 4" />
                          </svg>
                          {row.name}
                        </Link>
                        <Link
                          href={`/admin/products/${row.id}`}
                          className="mt-1.5 inline-block border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-500 transition-colors hover:bg-ink hover:text-bone"
                        >
                          Edit details
                        </Link>
                        <p className="mt-1 text-[11.5px] text-ink-300">
                          {row.category} · {row.gender}
                        </p>
                        <p className="mt-1 text-[11.5px] text-ink-300">
                          {row.colors.length} colours · {row.sizes.length} sizes
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-4">
                    <p className="tabular-nums">{formatUsd(row.priceCents)}</p>
                    {row.compareAtCents && (
                      <p className="mt-1 text-[11.5px] text-ink-300 line-through tabular-nums">
                        {formatUsd(row.compareAtCents)}
                      </p>
                    )}
                    {discount && (
                      <span className="mt-2 inline-block bg-ember px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] text-bone">
                        −{discount}%
                      </span>
                    )}

                  </td>

                  <td className="px-3 py-4">
                    {/* Read-only on purpose: the colour × size matrix is the
                        single source of truth, so editing here would drift. */}
                    <p
                      className={`w-20 border px-2.5 py-1.5 text-center text-[13px] tabular-nums ${
                        row.stock === 0
                          ? "border-ember/60 bg-ember/10 text-ember"
                          : row.stock <= 20
                            ? "border-brass/60 bg-brass/10 text-brass"
                            : "border-ink/15 bg-bone"
                      }`}
                    >
                      {row.stock}
                    </p>
                    <p className="mt-2 text-[11px] text-ink-300">
                      {row.stock === 0 ? "Sold out" : row.stock <= 20 ? "Low" : "Healthy"}
                    </p>
                    <Link
                      href={`/admin/stock?q=${encodeURIComponent(row.slug)}`}
                      className="link-underline mt-2 block text-[11px] uppercase tracking-[0.12em] text-ink-300"
                    >
                      Manage stock
                    </Link>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-2">
                      {(
                        [
                          { field: "isFeatured", label: "Featured", on: row.isFeatured },
                          { field: "isNewArrival", label: "New in", on: row.isNewArrival },
                          { field: "isBestSeller", label: "Best seller", on: row.isBestSeller },
                        ] as const
                      ).map((flag) => (
                        <form key={flag.field} action={toggleFlagAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="field" value={flag.field} />
                          <SubmitButton
                            label={`${flag.label} · ${flag.on ? "on" : "off"}`}
                            pendingLabel="Updating"
                            className={`flex w-[132px] items-center justify-between gap-1 border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                              flag.on
                                ? "border-ink bg-ink text-bone"
                                : "border-ink/15 text-ink-300 hover:border-ink/45"
                            }`}
                          />
                        </form>
                      ))}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/products/${row.slug}`}
                        className="link-underline text-[11.5px] uppercase tracking-[0.14em] text-ink-300"
                      >
                        View live
                      </Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <SubmitButton
                          label="Delete"
                          pendingLabel="Deleting"
                          className="border border-ember/50 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-bone"
                        />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="mt-6 border border-dashed border-sand px-5 py-12 text-center text-[13.5px] text-ink-300">
          No products match that filter.
        </p>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-ink-300">
        Collections available for assignment: {collectionRows.map((c) => c.name).join(" · ")}
      </p>
    </div>
  );
}
