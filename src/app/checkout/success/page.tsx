import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { ClearCart } from "@/components/clear-cart";
import { trackingLink } from "@/lib/tracking";
import { fulfilOrder, getOrderByNumber, SHIPPING_METHODS } from "@/lib/queries";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order confirmed" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const orderNumber = typeof params.order === "string" ? params.order : null;

  /* Returning from Stripe Checkout. The session is verified server-side and
     the order is only confirmed when Stripe reports it paid — never on the
     client's say-so. */
  const stripeSessionId = typeof params.session_id === "string" ? params.session_id : null;
  let verifiedNumber = orderNumber;

  if (stripeSessionId && stripeEnabled) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const session = await getStripe().checkout.sessions.retrieve(stripeSessionId);
      const paid = session.payment_status === "paid" || session.status === "complete";
      const orderId = Number(session.metadata?.orderId ?? 0);

      if (paid && orderId) {
        await fulfilOrder(orderId);
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        verifiedNumber = order?.orderNumber ?? verifiedNumber;
      } else if (orderId) {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        verifiedNumber = order?.orderNumber ?? verifiedNumber;
      }
    } catch {
      /* Stripe unreachable — the webhook still fulfils the order. */
    }
  }

  const result = verifiedNumber ? await getOrderByNumber(verifiedNumber) : null;

  const method = result
    ? SHIPPING_METHODS[result.order.shippingMethod as keyof typeof SHIPPING_METHODS] ??
      SHIPPING_METHODS.standard
    : SHIPPING_METHODS.standard;

  /* A dispatched parcel carries a carrier reference; before dispatch the
     column still holds the Stripe session, which is not trackable. */
  const tracking = trackingLink(result?.order.trackingNumber);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-16 md:px-10 md:py-24">
      {/* The Stripe redirect lands here — empty the bag stored on this device. */}
      <ClearCart />
      <div className="animate-fade-up text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-ink/15">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        </span>
        <p className="eyebrow mt-8 text-ink-300">Order confirmed</p>
        <h1 className="display-xl mt-5 text-[clamp(2.6rem,6vw,5rem)]">Thank you</h1>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-ink-500">
          {result
            ? `Your order ${result.order.orderNumber} is confirmed. A receipt is on its way to ${result.order.email}, and you'll get a DHL tracking link as soon as your parcel leaves the atelier.`
            : "Your order has been received. A confirmation email with your tracking link is on its way."}
        </p>

        {result && (
          <div className="mx-auto mt-8 max-w-xl">
            {/* ------------------------- tracking number, copyable -------- */}
            {tracking ? (
              <div className="border border-sand bg-linen p-5 text-left">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="eyebrow text-ink-300">Tracking number</p>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-brass">
                    {tracking.carrier}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="min-w-0 flex-1 break-all border border-dashed border-brass bg-brass/10 px-3 py-2.5 font-mono text-[13px] tracking-[0.08em]">
                    {tracking.number}
                  </code>
                  <CopyButton value={tracking.number} />
                </div>
                <a
                  href={tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 border border-ink/20 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
                >
                  Track my parcel
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                  </svg>
                </a>
                <p className="mt-3 text-[12px] leading-relaxed text-ink-300">
                  Opens {tracking.carrier} in a new tab. This link is also saved in your account.
                </p>
              </div>
            ) : (
              <div className="border border-sand bg-linen p-5 text-left">
                <p className="eyebrow text-ink-300">Order reference</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="min-w-0 flex-1 break-all border border-dashed border-brass bg-brass/10 px-3 py-2.5 font-mono text-[13px] tracking-[0.08em]">
                    {result.order.orderNumber}
                  </code>
                  <CopyButton value={result.order.orderNumber} />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-ink-300">
                  A DHL or UPS tracking number appears here as soon as your parcel leaves the atelier.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/account/orders"
                className="inline-flex items-center gap-2 bg-ink px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
              >
                Track in my account
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link
                href="/shop"
                className="border border-ink/20 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:border-ink"
              >
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-16 grid gap-px border border-ink/12 bg-ink/12 lg:grid-cols-3">
          <div className="bg-bone p-7">
            <p className="eyebrow text-ink-300">Order</p>
            <p className="mt-3 font-display text-2xl">{result.order.orderNumber}</p>
            <p className="mt-2 text-[12.5px] text-ink-300">
              Placed{" "}
              {new Date(result.order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-4 text-[13px] text-ink-500">
              {method.label} · {method.eta}
            </p>
          </div>

          <div className="bg-bone p-7">
            <p className="eyebrow text-ink-300">Delivering to</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">
              {result.order.fullName}
              <br />
              {result.order.address1}
              {result.order.address2 ? `, ${result.order.address2}` : ""}
              <br />
              {result.order.city}
              {result.order.region ? `, ${result.order.region}` : ""} {result.order.postalCode}
              <br />
              {result.order.country}
            </p>
          </div>

          <div className="bg-bone p-7">
            <p className="eyebrow text-ink-300">Total paid</p>
            <p className="mt-3 font-display text-3xl">
              <Price cents={result.order.totalCents} />
            </p>
            <dl className="mt-4 space-y-1.5 text-[12.5px] text-ink-300">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>
                  <Price cents={result.order.subtotalCents} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd>
                  {result.order.shippingCents === 0 ? (
                    "Complimentary"
                  ) : (
                    <Price cents={result.order.shippingCents} />
                  )}
                </dd>
              </div>
              {result.order.discountCents > 0 && (
                <div className="flex justify-between text-brass">
                  <dt>Discount {result.order.discountCode}</dt>
                  <dd>
                    −<Price cents={result.order.discountCents} />
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Duties &amp; taxes</dt>
                <dd>Included</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {result && (
        <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/12">
          {result.items.map((item) => (
            <li key={item.id} className="flex items-center gap-5 py-5">
              <Link
                href={`/products/${item.slug}`}
                className="relative h-[92px] w-[70px] shrink-0 overflow-hidden bg-bone-dark"
              >
                <Image src={item.image} alt={item.name} fill sizes="70px" className="object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${item.slug}`} className="link-underline text-[15px]">
                  {item.name}
                </Link>
                <p className="mt-1 text-[11.5px] uppercase tracking-[0.12em] text-ink-300">
                  {item.color}
                  {item.size ? ` · ${item.size}` : ""} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-[15px]">
                <Price cents={item.lineTotalCents} />
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/shop"
          className="bg-ink px-10 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="link-underline text-[11.5px] uppercase tracking-[0.18em] text-ink-300"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
