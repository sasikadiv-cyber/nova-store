import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/ui";
import { getOrderByNumber, SHIPPING_METHODS } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order confirmed" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const orderNumber = typeof params.order === "string" ? params.order : null;
  const result = orderNumber ? await getOrderByNumber(orderNumber) : null;

  const method = result
    ? SHIPPING_METHODS[result.order.shippingMethod as keyof typeof SHIPPING_METHODS] ??
      SHIPPING_METHODS.standard
    : SHIPPING_METHODS.standard;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-16 md:px-10 md:py-24">
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
