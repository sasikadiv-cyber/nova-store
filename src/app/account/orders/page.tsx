import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/ui";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getCustomerOrders, isActive, statusLabel } from "@/lib/customer-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Orders & tracking" };

export default async function AccountOrdersPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return null;

  const allOrders = await getCustomerOrders(customer.id);
  const active = allOrders.filter((entry) => isActive(entry.order));
  const past = allOrders.filter((entry) => !isActive(entry.order));

  return (
    <div>
      <p className="eyebrow text-sage">History</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Orders &amp; tracking</h1>
      <p className="mt-3 text-[13px] text-ink-300">
        {allOrders.length} orders · {active.length} in progress
      </p>

      {allOrders.length === 0 && (
        <p className="mt-8 border border-dashed border-sand bg-linen px-5 py-16 text-center text-[13.5px] text-ink-300">
          No orders yet.{" "}
          <Link href="/shop" className="link-underline text-ink">
            Browse the collection
          </Link>
          .
        </p>
      )}

      {[
        { title: "In progress", rows: active },
        { title: "Completed", rows: past },
      ]
        .filter((group) => group.rows.length > 0)
        .map((group) => (
          <section key={group.title} className="mt-10">
            <h2 className="text-2xl">{group.title}</h2>
            <ul className="mt-5 space-y-3">
              {group.rows.map(({ order, items }) => (
                <li key={order.id} className="border border-sand bg-linen">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-bone-dark/50"
                  >
                    <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden bg-bone-dark">
                      <Image
                        src={items[0]?.image ?? ""}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-[180px] flex-1">
                      <p className="font-display text-[22px] leading-none">{order.orderNumber}</p>
                      <p className="mt-2 text-[11.5px] text-ink-300">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {items.reduce((t, i) => t + i.quantity, 0)} pieces · {order.shippingMethod}{" "}
                        shipping
                      </p>
                      {order.trackingNumber && (
                        <p className="mt-1 font-mono text-[11px] text-ink-300">
                          {order.trackingNumber}
                        </p>
                      )}
                      {order.status === "delivered" && (
                        <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-brass">
                          ★ Ready to review
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em] ${
                        isActive(order) ? "bg-brass/20 text-brass" : "bg-sand text-ink-500"
                      }`}
                    >
                      {statusLabel(order.status)}
                    </span>

                    <span className="text-[15px] tabular-nums">
                      <Price cents={order.totalCents} />
                    </span>

                    <span className="text-ink-300">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M4 12h15M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
