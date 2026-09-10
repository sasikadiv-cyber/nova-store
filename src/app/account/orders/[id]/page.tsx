import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewComposer } from "@/components/account/review-composer";
import { Price } from "@/components/ui";
import { getCustomerReviews } from "@/lib/customer-queries";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  getCustomerOrder,
  ORDER_FLOW,
  statusIndex,
  statusLabel,
} from "@/lib/customer-queries";
import { formatUsd } from "@/lib/currency";
import { SHIPPING_METHODS } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order details" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) notFound();

  const customer = await getCurrentCustomer();
  if (!customer) return null;

  const result = await getCustomerOrder(customer.id, orderId);
  if (!result) notFound();

  const { order, items, events } = result;
  const reviewed = new Set(
    (await getCustomerReviews(customer.id)).map((row) => row.review.productId),
  );
  const canReview = order.status === "delivered";
  const current = statusIndex(order.status);
  const method =
    SHIPPING_METHODS[order.shippingMethod as keyof typeof SHIPPING_METHODS] ??
    SHIPPING_METHODS.standard;

  return (
    <div>
      <Link
        href="/account/orders"
        className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
      >
        All orders
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-sage">Order</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-none">
            {order.orderNumber}
          </h1>
          <p className="mt-3 text-[12.5px] text-ink-300">
            Placed{" "}
            {new Date(order.createdAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] ${
              order.status === "delivered" ? "bg-ok text-bone" : "bg-ink text-bone"
            }`}
          >
            {statusLabel(order.status)}
          </span>
          <p className="mt-2.5 text-[20px]">
            <Price cents={order.totalCents} />
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------ tracking */}
      <section className="mt-10 border border-sand bg-linen p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">Tracking</h2>
          <p className="text-[12.5px] text-ink-300">
            {method.label} · {method.eta}
            {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
          </p>
        </div>

        <div className="mt-7">
          {/* progress rail */}
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-[9px] h-[2px] bg-sand" />
            <div
              className="absolute left-0 top-[9px] h-[2px] bg-brass transition-[width] duration-700"
              style={{ width: `${(current / (ORDER_FLOW.length - 1)) * 100}%` }}
            />
            {ORDER_FLOW.map((step, index) => {
              const done = index <= current;
              return (
                <div key={step.id} className="relative flex flex-col items-center">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 bg-linen transition-colors ${
                      done ? "border-brass bg-brass" : "border-sand"
                    }`}
                  >
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f7f4ef" strokeWidth="3.5">
                        <path d="M4 12.5l5 5L20 6.5" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`mt-3 max-w-[92px] text-center text-[10px] uppercase tracking-[0.1em] ${
                      done ? "text-ink" : "text-ink-300"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {events.length > 0 && (
          <ul className="mt-9 space-y-3.5 border-t border-sand pt-6">
            {[...events].reverse().map((event) => (
              <li key={event.id} className="flex gap-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass" />
                <div>
                  <p className="text-[13.5px]">{statusLabel(event.status)}</p>
                  {event.note && (
                    <p className="mt-0.5 text-[12px] text-ink-300">{event.note}</p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-300">
                    {new Date(event.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* --------------------------------------------------------- items */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl">In this order</h2>
            {canReview && (
              <p className="text-[12px] text-ink-300">
                Delivered — share how it wore and help the next client choose.
              </p>
            )}
          </div>
          <ul className="mt-4 divide-y divide-sand border-y border-sand">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <Link
                  href={`/products/${item.slug}`}
                  className="relative h-[84px] w-[64px] shrink-0 overflow-hidden bg-bone-dark"
                >
                  <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.slug}`} className="link-underline text-[14px]">
                    {item.name}
                  </Link>
                  <p className="mt-1 text-[11.5px] uppercase tracking-[0.1em] text-ink-300">
                    {item.color}
                    {item.size ? ` · ${item.size}` : ""} · Qty {item.quantity}
                  </p>
                  {canReview && (
                    <ReviewComposer
                      productId={item.productId}
                      productName={item.name}
                      alreadyReviewed={reviewed.has(item.productId)}
                    />
                  )}
                </div>
                <p className="text-[14px] tabular-nums">
                  <Price cents={item.lineTotalCents} />
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------- detail */}
        <section className="border border-sand bg-linen p-6">
          <h2 className="text-2xl">Delivery &amp; payment</h2>

          <div className="mt-5 space-y-5 text-[13px]">
            <div>
              <p className="eyebrow text-ink-300">Shipping to</p>
              <p className="mt-2.5 leading-relaxed text-ink-500">
                {order.fullName}
                <br />
                {order.address1}
                {order.address2 ? `, ${order.address2}` : ""}
                <br />
                {order.city}
                {order.region ? `, ${order.region}` : ""} {order.postalCode}
                <br />
                {order.country}
              </p>
            </div>

            <div>
              <p className="eyebrow text-ink-300">Contact</p>
              <p className="mt-2.5 text-ink-500">
                {order.email}
                {order.phone ? <><br />{order.phone}</> : null}
              </p>
            </div>

            <dl className="space-y-2 border-t border-sand pt-4 text-[13px] tabular-nums">
              <div className="flex justify-between">
                <dt className="text-ink-300">Subtotal</dt>
                <dd>{formatUsd(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-brass">
                  <dt>{order.discountCode}</dt>
                  <dd>−{formatUsd(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-300">Shipping</dt>
                <dd>
                  {order.shippingCents === 0 ? "Complimentary" : formatUsd(order.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-300">Duties &amp; taxes</dt>
                <dd className="text-ink-300">Included</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-sand pt-3">
                <dt className="text-[15px]">Total</dt>
                <dd className="text-[20px]">{formatUsd(order.totalCents)}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
