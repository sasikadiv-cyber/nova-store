import { desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { formatUsd } from "@/lib/currency";
import { ORDER_FLOW, statusLabel } from "@/lib/customer-queries";
import { deleteOrderAction, updateOrderStatusAction } from "../actions";
import { SubmitButton } from "@/components/admin/submit-button";

export const dynamic = "force-dynamic";

const STATUSES = [...ORDER_FLOW.map((step) => step.id), "cancelled", "refunded"];

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  const ids = rows.map((row) => row.id);
  const items = ids.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
    : [];

  const revenue = rows.reduce((total, row) => total + row.totalCents, 0);

  return (
    <div>
      <p className="eyebrow text-sage">Commerce</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Orders</h1>
      <p className="mt-3 text-[13px] text-ink-300">
        {rows.length} orders · {formatUsd(revenue)} lifetime revenue
      </p>

      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Order updated.
        </p>
      )}
      {params.deleted && (
        <p className="mt-6 border-l-2 border-ember bg-linen px-4 py-3 text-[13px]">
          Order removed.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-8 border border-dashed border-sand px-5 py-16 text-center text-[13.5px] text-ink-300">
          No orders yet. Place one from the storefront checkout to see it here.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {rows.map((order) => {
            const lines = items.filter((item) => item.orderId === order.id);
            return (
              <article key={order.id} className="border border-sand bg-linen">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand p-5">
                  <div>
                    <p className="font-display text-2xl leading-none">{order.orderNumber}</p>
                    <p className="mt-2 text-[12.5px] text-ink-300">
                      {new Date(order.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="min-w-[200px] text-[13px]">
                    <p className="font-medium">{order.fullName}</p>
                    <p className="mt-1 text-ink-300">{order.email}</p>
                    <p className="mt-1 text-ink-300">
                      {order.address1}
                      {order.address2 ? `, ${order.address2}` : ""}
                      <br />
                      {order.city}
                      {order.region ? `, ${order.region}` : ""} {order.postalCode}
                      <br />
                      {order.country}
                    </p>
                  </div>

                  <div className="text-[13px]">
                    <p className="text-ink-300">{order.shippingMethod} shipping</p>
                    <dl className="mt-2 space-y-1 tabular-nums">
                      <div className="flex justify-between gap-6">
                        <dt className="text-ink-300">Subtotal</dt>
                        <dd>{formatUsd(order.subtotalCents)}</dd>
                      </div>
                      {order.discountCents > 0 && (
                        <div className="flex justify-between gap-6 text-brass">
                          <dt>{order.discountCode}</dt>
                          <dd>−{formatUsd(order.discountCents)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-6">
                        <dt className="text-ink-300">Shipping</dt>
                        <dd>
                          {order.shippingCents === 0 ? "Free" : formatUsd(order.shippingCents)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6 border-t border-sand pt-1">
                        <dt>Total</dt>
                        <dd className="font-medium">{formatUsd(order.totalCents)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <form
                      action={updateOrderStatusAction}
                      className="flex flex-col items-end gap-2 border border-sand bg-bone p-3"
                    >
                      <input type="hidden" name="id" value={order.id} />
                      <select
                        name="status"
                        defaultValue={order.status}
                        className="border border-ink/15 bg-bone px-2.5 py-1.5 text-[12px] outline-none focus:border-ink"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        label="Update"
                        pendingLabel="Updating"
                        className="border border-ink/15 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors hover:bg-ink hover:text-bone"
                      />
                      <input
                        name="tracking"
                        defaultValue={order.trackingNumber}
                        placeholder="Tracking no. (DHL-…)"
                        className="w-[220px] border border-ink/15 bg-bone px-2.5 py-1.5 font-mono text-[11.5px] outline-none focus:border-ink"
                      />
                      <input
                        name="note"
                        placeholder="Note for the client timeline"
                        className="w-[220px] border border-ink/15 bg-bone px-2.5 py-1.5 text-[11.5px] outline-none focus:border-ink"
                      />
                    </form>
                    <form action={deleteOrderAction}>
                      <input type="hidden" name="id" value={order.id} />
                      <SubmitButton
                        label="Delete"
                        pendingLabel="Deleting"
                        className="border border-ember/50 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-bone"
                      />
                    </form>
                  </div>
                </div>

                <ul className="divide-y divide-sand/70">
                  {lines.map((line) => (
                    <li
                      key={line.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[13px]"
                    >
                      <span className="min-w-0">
                        {line.name}
                        <span className="ml-2 text-[11.5px] uppercase tracking-[0.1em] text-ink-300">
                          {line.color}
                          {line.size ? ` · ${line.size}` : ""}
                        </span>
                      </span>
                      <span className="tabular-nums text-ink-300">
                        ×{line.quantity} · {formatUsd(line.lineTotalCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
