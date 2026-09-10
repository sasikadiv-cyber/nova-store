import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutFlow } from "@/components/checkout-flow";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure global checkout with duties and taxes included.",
};

/**
 * Checkout requires a signed-in account.
 *
 * The order API enforces this on the server, so this gate is UX rather than
 * security: it tells the client they need to sign in before they type their
 * address. The bag is kept in local storage, so nothing is lost on the way
 * through the sign-in page.
 */
export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1100px] flex-col items-center justify-center gap-6 px-5 py-16 text-center md:px-10 md:py-24">
        <p className="eyebrow text-sage">Secure checkout</p>
        <h1 className="display-xl text-[clamp(2.4rem,6vw,4.4rem)]">
          Sign in to
          <span className="italic text-brass"> place your order</span>
        </h1>
        <p className="max-w-lg text-[14.5px] leading-relaxed text-ink-500">
          Orders are tied to a Nova account so you can follow your parcel from the atelier to your
          door, review your pieces once they arrive, and check out in a couple of taps next time.
        </p>

        <ul className="mt-2 grid w-full max-w-md gap-3 text-left">
          {[
            "Live tracking on every order",
            "Full order history and receipts",
            "Saved cards for faster checkout",
            "Reviews on the pieces you own",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 border border-sand bg-linen px-4 py-3">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 text-brass"
                aria-hidden="true"
              >
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              <span className="text-[13.5px] text-ink-500">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/account/login?next=/checkout"
            className="bg-ink px-10 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
          >
            Sign in or create an account
          </Link>
          <Link
            href="/shop"
            className="link-underline text-[11.5px] uppercase tracking-[0.18em] text-ink-300"
          >
            Continue shopping
          </Link>
        </div>

        <p className="mt-4 max-w-sm text-[12px] leading-relaxed text-ink-300">
          Your bag is saved on this device — it will still be here after you sign in.
        </p>
      </div>
    );
  }

  return (
    <CheckoutFlow
      customer={{
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
        address1: customer.defaultAddress1,
        address2: customer.defaultAddress2,
        city: customer.defaultCity,
        region: customer.defaultRegion,
        postalCode: customer.defaultPostalCode,
        country: customer.defaultCountry || "United States",
      }}
    />
  );
}
