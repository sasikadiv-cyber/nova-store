import Link from "next/link";
import { desc, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, products, reviews } from "@/db/schema";
import { formatUsd } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [catalog] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      stock: sql<number>`cast(coalesce(sum(${products.stock}), 0) as int)`,
      lowStock: sql<number>`cast(count(*) filter (where ${products.stock} <= 20) as int)`,
      onSale: sql<number>`cast(count(*) filter (where ${products.compareAtCents} is not null) as int)`,
      featured: sql<number>`cast(count(*) filter (where ${products.isFeatured}) as int)`,
      newArrivals: sql<number>`cast(count(*) filter (where ${products.isNewArrival}) as int)`,
      avgRating: sql<number>`cast(coalesce(avg(${products.rating}), 0) as float)`,
    })
    .from(products);

  const [sales] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      revenue: sql<number>`cast(coalesce(sum(${orders.totalCents}), 0) as int)`,
      average: sql<number>`cast(coalesce(avg(${orders.totalCents}), 0) as float)`,
    })
    .from(orders);

  const [reviewCount] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(reviews);

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(6);

  const lowStock = await db
    .select()
    .from(products)
    .where(lte(products.stock, 20))
    .orderBy(products.stock)
    .limit(6);

  const kpis = [
    { label: "Revenue", value: formatUsd(sales?.revenue ?? 0), note: `${sales?.count ?? 0} orders` },
    {
      label: "Average order",
      value: formatUsd(Math.round(sales?.average ?? 0)),
      note: "across all markets",
    },
    { label: "Pieces in season", value: `${catalog?.total ?? 0}`, note: `${catalog?.stock ?? 0} units in stock` },
    {
      label: "Rating",
      value: `${(catalog?.avgRating ?? 0).toFixed(1)}`,
      note: `${reviewCount?.total ?? 0} reviews`,
    },
  ];

  return (
    <div>
      <p className="eyebrow text-sage">Overview</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Store health</h1>
      <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
        Everything you change here is live on the storefront immediately — no rebuild, no deploy.
      </p>

      <div className="mt-9 grid gap-px border border-sand bg-sand sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-linen p-6">
            <p className="eyebrow text-ink-300">{kpi.label}</p>
            <p className="mt-3 font-display text-[34px] leading-none">{kpi.value}</p>
            <p className="mt-3 text-[12px] text-ink-300">{kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* ------------------------------------------------------ flags */}
        <section className="border border-sand bg-linen p-6">
          <h2 className="text-2xl">Merchandising</h2>
          <p className="mt-2 text-[12.5px] text-ink-300">
            Controls what the home page promotes.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-px border border-sand bg-sand">
            {[
              { label: "Featured", value: catalog?.featured ?? 0, href: "/admin/products" },
              { label: "New in", value: catalog?.newArrivals ?? 0, href: "/admin/products" },
              { label: "On sale", value: catalog?.onSale ?? 0, href: "/admin/products" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="bg-bone p-4 hover:bg-linen">
                <dt className="eyebrow text-[9.5px] text-ink-300">{item.label}</dt>
                <dd className="mt-2 font-display text-2xl">{item.value}</dd>
              </Link>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/admin/products/new"
              className="bg-ink px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700"
            >
              Add a product
            </Link>
            <Link
              href="/admin/products"
              className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
            >
              Manage stock
            </Link>
            <Link
              href="/admin/collections"
              className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
            >
              Collections
            </Link>
          </div>
        </section>

        {/* -------------------------------------------------- low stock */}
        <section className="border border-sand bg-linen p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl">Low stock</h2>
            <span className="eyebrow text-ember">{catalog?.lowStock ?? 0} styles</span>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-300">
              Healthy — no style is below the 20-unit threshold.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-sand">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${item.id}`} className="link-underline text-[13.5px]">
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-ink-300">{item.category}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-[11px] tabular-nums ${
                      item.stock <= 10 ? "bg-ember text-bone" : "bg-sand text-ink"
                    }`}
                  >
                    {item.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ------------------------------------------------- recent orders */}
      <section className="mt-10 border border-sand bg-linen p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            All orders
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-300">
            No orders yet — place one from the storefront to see it appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-sand text-[10.5px] uppercase tracking-[0.14em] text-ink-300">
                  <th className="py-2.5 pr-4 font-medium">Order</th>
                  <th className="py-2.5 pr-4 font-medium">Client</th>
                  <th className="py-2.5 pr-4 font-medium">Country</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-sand/70">
                    <td className="py-3 pr-4 tabular-nums">{order.orderNumber}</td>
                    <td className="py-3 pr-4">
                      <span className="block truncate">{order.fullName}</span>
                      <span className="block truncate text-[11.5px] text-ink-300">{order.email}</span>
                    </td>
                    <td className="py-3 pr-4 text-ink-300">{order.country}</td>
                    <td className="py-3 pr-4">
                      <span className="border border-ink/15 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-ink-500">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">{formatUsd(order.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
