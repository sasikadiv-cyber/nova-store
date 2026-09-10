import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/ui";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  getCustomerOrders,
  getCustomerStats,
  isActive,
  statusLabel,
} from "@/lib/customer-queries";
import { formatUsd } from "@/lib/currency";

export const dynamic = "force-dynamic";

export const metadata = { title: "Account overview" };

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return null;

  const [allOrders, stats] = await Promise.all([
    getCustomerOrders(customer.id),
    getCustomerStats(customer.id),
  ]);

  const activeOrders = allOrders.filter((entry) => isActive(entry.order));
  const recent = allOrders.slice(0, 4);

  const kpis = [
    { label: "Active orders", value: `${stats.active}`, note: "on their way" },
    { label: "Delivered", value: `${stats.delivered}`, note: "lifetime orders" },
    { label: "Total orders", value: `${stats.orders}`, note: "since joining" },
    { label: "Reviews written", value: `${stats.reviews}`, note: "on your pieces" },
  ];

  return (
    <div>
      <p className="eyebrow text-sage">Overview</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">
        Hello, {customer.fullName.split(" ")[0]}
      </h1>
      <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
        Everything you have ordered, plus live tracking, your reviews and saved cards.
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

      {/* -------------------------------------------------- active tracking */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl">In progress</h2>
          <Link
            href="/account/orders"
            className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            All orders
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <p className="mt-4 border border-dashed border-sand bg-linen px-5 py-10 text-center text-[13.5px] text-ink-300">
            Nothing on its way right now. Your next order will appear here the moment it is
            confirmed.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {activeOrders.map(({ order, items }) => (
              <article key={order.id} className="border border-sand bg-linen p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl leading-none">{order.orderNumber}</p>
                    <p className="mt-2 text-[12px] text-ink-300">
                      Placed{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-ink px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-bone">
                      {statusLabel(order.status)}
                    </span>
                    <p className="mt-2 text-[15px]">
                      <Price cents={order.totalCents} />
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  {items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="relative h-14 w-11 shrink-0 overflow-hidden bg-bone-dark"
                      title={item.name}
                    >
                      <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                    </div>
                  ))}
                  <span className="text-[12px] text-ink-300">
                    {items.reduce((total, item) => total + item.quantity, 0)} pieces
                  </span>
                </div>

                <Link
                  href={`/account/orders/${order.id}`}
                  className="mt-5 inline-block bg-ink px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700"
                >
                  Track this order
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- recent orders */}
      <section className="mt-12">
        <h2 className="text-2xl">Recent orders</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-ink-300">
            No orders yet — <Link href="/shop" className="link-underline text-ink">start shopping</Link>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-sand border-y border-sand">
            {recent.map(({ order, items }) => (
              <li key={order.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-bone-dark">
                  <Image
                    src={items[0]?.image ?? ""}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="link-underline text-[14px]"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="mt-1 text-[11.5px] text-ink-300">
                    {new Date(order.createdAt).toLocaleDateString("en-GB")} ·{" "}
                    {items.reduce((t, i) => t + i.quantity, 0)} pieces · {order.shippingMethod}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em] ${
                    isActive(order) ? "bg-brass/20 text-brass" : "bg-sand text-ink-500"
                  }`}
                >
                  {statusLabel(order.status)}
                </span>
                <span className="w-20 text-right text-[14px] tabular-nums">
                  {formatUsd(order.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
