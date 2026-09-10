import Link from "next/link";
import { eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { StockMatrix } from "@/components/admin/stock-matrix";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ensureAllVariants, getVariantsForProducts } from "@/lib/variants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Stock management" };

export default async function AdminStock({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  /* Creates variant rows for any product that lacks them, and for any newly
     added colour or size, before the matrix is drawn. */
  await ensureAllVariants();

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

  const categoryRows = await db
    .select({ category: products.category, count: sql<number>`cast(count(*) as int)` })
    .from(products)
    .groupBy(products.category)
    .orderBy(products.category);

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? sql.join(conditions, sql` and `) : undefined)
    .orderBy(products.category, products.name)
    .limit(150);

  const variantMap = await getVariantsForProducts(rows.map((row) => row.id));

  const totalUnits = rows.reduce((total, row) => total + row.stock, 0);
  const soldOut = rows.filter((row) => row.stock === 0).length;
  const lowStock = rows.filter((row) => row.stock > 0 && row.stock <= 20).length;
  const catalogueSize = categoryRows.reduce((total, row) => total + row.count, 0);

  return (
    <div>
      <p className="eyebrow text-sage">Inventory</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Stock management</h1>
      <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-300">
        Every colour and size combination is held separately. Change as many counts as you like,
        then press <span className="text-ink">Update stock</span> — nothing is written to the
        database until you do.
      </p>

      <div className="mt-8 grid gap-px border border-sand bg-sand sm:grid-cols-4">
        {[
          { label: "Styles listed", value: `${rows.length}` },
          { label: "Units on hand", value: `${totalUnits}` },
          { label: "Low stock styles", value: `${lowStock}` },
          { label: "Sold out styles", value: `${soldOut}` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-linen p-5">
            <p className="eyebrow text-ink-300">{kpi.label}</p>
            <p className="mt-3 font-display text-3xl leading-none">{kpi.value}</p>
          </div>
        ))}
      </div>

      {(search || category) && (
        <p className="mt-6 text-[12.5px] text-ink-500">
          Filtered by
          {category && <span className="text-ink"> {category}</span>}
          {search && (
            <span>
              {category ? " · " : ""}
              <span className="text-ink">&ldquo;{search}&rdquo;</span>
            </span>
          )}{" "}
          — showing {rows.length} of {catalogueSize} styles.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 text-ink-300">Quick filter</span>
        <Link
          href="/admin/stock"
          className={`border px-3 py-1.5 text-[11.5px] transition-colors ${
            category === ""
              ? "border-ink bg-ink text-bone"
              : "border-ink/15 text-ink-500 hover:border-ink/45"
          }`}
        >
          All
        </Link>
        {categoryRows.map((row) => (
          <Link
            key={row.category}
            href={`/admin/stock?category=${encodeURIComponent(row.category)}`}
            className={`border px-3 py-1.5 text-[11.5px] transition-colors ${
              category === row.category
                ? "border-ink bg-ink text-bone"
                : "border-ink/15 text-ink-500 hover:border-ink/45"
            }`}
          >
            {row.category} · {row.count}
          </Link>
        ))}
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3 border border-sand bg-linen p-4">
        <label className="min-w-[200px] flex-1">
          <span className="eyebrow text-ink-300">Search</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Product name or slug…"
            className="mt-2 w-full border border-ink/15 bg-bone px-3 py-2 text-[13.5px] outline-none focus:border-ink"
          />
        </label>

        <label>
          <span className="eyebrow text-ink-300">Category</span>
          <select
            name="category"
            defaultValue={category}
            className="mt-2 border border-ink/15 bg-bone px-3 py-2 text-[13.5px] outline-none focus:border-ink"
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
            href="/admin/stock"
            className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="mt-8 border border-dashed border-sand px-5 py-16 text-center text-[13.5px] text-ink-300">
          No products match that search.
        </p>
      ) : (
        <div className="mt-6">
          <StockMatrix
            products={rows.map((product) => ({
              id: product.id,
              slug: product.slug,
              name: product.name,
              category: product.category,
              image: product.images[0] ?? "",
              stock: product.stock,
              colors: product.colors,
              variants: (variantMap.get(product.id) ?? []).map((row) => ({
                color: row.color,
                size: row.size,
                stock: row.stock,
              })),
            }))}
          />
        </div>
      )}
    </div>
  );
}
