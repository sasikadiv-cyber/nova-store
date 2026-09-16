"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FREE_SHIPPING_THRESHOLD, useStore } from "./store-provider";
import { Price, Spinner } from "./ui";
import { StripeEmbedded } from "./stripe-embedded";

const COUNTRIES = [
  "Australia", "Austria", "Belgium", "Brazil", "Canada", "China", "Denmark", "Finland",
  "France", "Germany", "Hong Kong", "Ireland", "Italy", "Japan", "Mexico", "Netherlands",
  "New Zealand", "Norway", "Poland", "Portugal", "Qatar", "Singapore", "South Korea",
  "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates",
  "United Kingdom", "United States",
];

const METHODS = [
  { id: "standard", label: "Standard global", eta: "5–8 business days · carbon neutral", cents: 1800 },
  { id: "express", label: "Express (DHL)", eta: "2–4 business days · tracked door to door", cents: 3200 },
  { id: "priority", label: "Priority courier", eta: "Next business day to major cities", cents: 5800 },
] as const;

type FormState = {
  email: string;
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  shippingMethod: (typeof METHODS)[number]["id"];
};

const STEPS = ["Contact & delivery", "Payment", "Review"];

type CustomerPrefill = {
  email: string;
  fullName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export function CheckoutFlow({ customer = null }: { customer?: CustomerPrefill | null }) {
  const {
    lines,
    subtotalCents,
    discountCents,
    itemCount,
    promo,
    promoError,
    applyPromo,
    clearPromo,
    clearCart,
    hydrated,
  } = useStore();
  const [codeInput, setCodeInput] = useState("");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [demoCheckout, setDemoCheckout] = useState(false);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    email: customer?.email ?? "",
    fullName: customer?.fullName ?? "",
    address1: customer?.address1 ?? "",
    address2: customer?.address2 ?? "",
    city: customer?.city ?? "",
    region: customer?.region ?? "",
    postalCode: customer?.postalCode ?? "",
    country: customer?.country ?? "United States",
    phone: customer?.phone ?? "",
    shippingMethod: "standard",
  });

  const method = METHODS.find((entry) => entry.id === form.shippingMethod) ?? METHODS[0];
  const shippingCents =
    method.id === "standard" && subtotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : method.cents;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  const set = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const stepValid = () => {
    if (step === 0) {
      return (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
        form.fullName.trim().length > 1 &&
        form.address1.trim().length > 3 &&
        form.city.trim().length > 1 &&
        form.postalCode.trim().length > 2
      );
    }
    if (step === 1) {
      /* Card details are collected by Stripe, so nothing to validate here. */
      return true;
    }
    return true;
  };

  const next = () => {
    if (!stepValid()) {
      setError("Please complete the highlighted fields.");
      return;
    }
    setError(null);
    setStep((current) => Math.min(2, current + 1));
  };

  /* Card payments run on Stripe Checkout, so card details are entered on
     Stripe's own page and never reach this server. Without Stripe keys the
     order falls back to the demo flow. */
  async function startStripeCheckout() {
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        fullName: form.fullName,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        region: form.region,
        postalCode: form.postalCode,
        country: form.country,
        phone: form.phone,
        shippingMethod: form.shippingMethod,
        discountCode: promo?.code ?? "",
        items: lines.map((line) => ({
          slug: line.slug,
          size: line.size,
          color: line.color,
          quantity: line.quantity,
        })),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; clientSecret?: string; error?: string }
      | null;

    if (response.status === 503) return "unavailable";
    if (!response.ok || !payload?.ok || !payload.clientSecret) {
      throw new Error(payload?.error ?? "Could not start the payment.");
    }

    /* The payment form mounts in place on the next step. */
    setStripeSecret(payload.clientSecret);
    return "embedded";
  }

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const outcome = await startStripeCheckout();
      if (outcome === "embedded") {
        /* Advance to the payment step, where the Stripe form mounts. */
        setStep(1);
        setSubmitting(false);
        return;
      }

      /* Stripe must be configured — there is no demo checkout. */
      throw new Error(
        "Card payments are not configured on this store. Add STRIPE_SECRET_KEY to enable checkout.",
      );

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          fullName: form.fullName,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          region: form.region,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone,
          shippingMethod: form.shippingMethod,
          discountCode: promo?.code ?? "",
          items: lines.map((line) => ({
            slug: line.slug,
            size: line.size,
            color: line.color,
            quantity: line.quantity,
          })),
        }),
      });

      const payload = (await response.json()) as { ok: boolean; orderNumber?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.orderNumber) {
        throw new Error(payload.error ?? "We could not place your order.");
      }
      clearCart();
      router.push(`/checkout/success?order=${payload.orderNumber}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (hydrated && lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 py-28 text-center">
        <p className="eyebrow text-ink-300">Checkout</p>
        <h1 className="text-4xl">Your bag is empty</h1>
        <p className="text-[14px] leading-relaxed text-ink-300">
          Add a piece or two and your order will be waiting here, saved to this device.
        </p>
        <Link
          href="/shop"
          className="mt-2 bg-ink px-9 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-10 md:px-10 md:py-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-ink-300">Secure checkout</p>
          <h1 className="mt-3 text-[clamp(2.2rem,4.6vw,3.6rem)]">Almost yours</h1>
          {customer ? (
            <p className="mt-3 text-[13px] text-ink-500">
              Signed in as <span className="text-ink">{customer.email}</span> — this order will
              appear in your account with live tracking.
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-ink-500">
              Checking out as a guest.{" "}
              <Link href="/account/login" className="link-underline text-ink">
                Sign in
              </Link>{" "}
              to keep this order in your account with tracking.
            </p>
          )}
        </div>
        <p className="text-[12.5px] text-ink-300">
          {itemCount} {itemCount === 1 ? "item" : "items"} · duties &amp; taxes included
        </p>
      </div>

      {/* progress */}
      <ol className="mt-10 flex items-center gap-3 border-y border-ink/12 py-4 text-[11px] uppercase tracking-[0.16em]">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              className={`flex items-center gap-2.5 ${
                index <= step ? "text-ink" : "text-ink-300"
              } ${index < step ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-[10.5px] tabular-nums transition-colors ${
                  index < step
                    ? "border-ink bg-ink text-bone"
                    : index === step
                      ? "border-ink text-ink"
                      : "border-ink/20 text-ink-300"
                }`}
              >
                {index < step ? "✓" : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${index < step ? "bg-ink" : "bg-ink/15"}`} />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
        <div>
          {step === 0 && (
            <section className="animate-fade-up space-y-8">
              <Field label="Email address" value={form.email} onChange={(v) => set("email", v)} type="email" hint="For your receipt and tracking link." />
              <Field label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} />
              <Field label="Street address" value={form.address1} onChange={(v) => set("address1", v)} />
              <Field label="Apartment, suite (optional)" value={form.address2} onChange={(v) => set("address2", v)} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
                <Field label="State / region" value={form.region} onChange={(v) => set("region", v)} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Postal code" value={form.postalCode} onChange={(v) => set("postalCode", v)} />
                <label className="block">
                  <span className="eyebrow text-ink-300">Country</span>
                  <select
                    value={form.country}
                    onChange={(event) => set("country", event.target.value)}
                    className="mt-2 w-full appearance-none border border-ink/15 bg-transparent px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Field label="Phone (optional)" value={form.phone} onChange={(v) => set("phone", v)} type="tel" />
            </section>
          )}

          {step === 1 && (
            <section className="animate-fade-up space-y-10">
              <div>
                <p className="eyebrow text-ink-300">Delivery method</p>
                <div className="mt-4 grid gap-3">
                  {METHODS.map((option) => {
                    const active = form.shippingMethod === option.id;
                    const free = option.id === "standard" && subtotalCents >= FREE_SHIPPING_THRESHOLD;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => set("shippingMethod", option.id)}
                        className={`flex items-center justify-between gap-4 border px-5 py-4 text-left transition-colors ${
                          active ? "border-ink bg-ink/[0.03]" : "border-ink/15 hover:border-ink/45"
                        }`}
                      >
                        <span className="flex items-center gap-4">
                          <span
                            className={`grid h-4 w-4 place-items-center rounded-full border ${
                              active ? "border-ink" : "border-ink/30"
                            }`}
                          >
                            {active && <span className="h-2 w-2 rounded-full bg-ink" />}
                          </span>
                          <span>
                            <span className="block text-[14.5px]">{option.label}</span>
                            <span className="mt-0.5 block text-[12px] text-ink-300">{option.eta}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-[14px]">
                          {free ? "Complimentary" : <Price cents={option.cents} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-ink-300">Payment</p>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-ink-300">
                    Secured by Stripe
                  </span>
                </div>
                <div className="mt-4 space-y-4 border border-ink/12 p-5">
                  {/* Card details are collected on Stripe's own page, so they
                      never touch this server. */}
                  <div className="flex items-center gap-3">
                    <span className="grid h-[42px] w-[62px] shrink-0 place-items-center rounded-[4px] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/stripe.svg"
                        alt="Stripe"
                        width={52}
                        height={14}
                        className="h-[14px] w-auto object-contain"
                      />
                    </span>
                    <div>
                      <p className="text-[14px]">Card payment via Stripe</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-300">
                        Visa · Mastercard · Amex · Apple Pay · Google Pay
                      </p>
                    </div>
                  </div>

                  <p className="text-[12.5px] leading-relaxed text-ink-500">
                    You will be taken to Stripe&#39;s secure page to enter your card details. Card
                    information is handled entirely by Stripe and never passes through this store.
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-3">
                    <span className="eyebrow text-ink-300">Total to be authorised</span>
                    <span className="text-[17px]">
                      <Price cents={totalCents} />
                    </span>
                  </div>
                </div>
              </div>

              {/* ---------------- Stripe Payment Element, in place ---------- */}
              {step === 1 && stripeSecret && (
                <div className="mt-6">
                  {paymentError && (
                    <p className="mb-4 border-l-2 border-ember bg-bone px-4 py-3 text-[13px] text-ember">
                      {paymentError}
                    </p>
                  )}
                  <StripeEmbedded
                    clientSecret={stripeSecret}
                    returnPath={`${
                      typeof window !== "undefined" ? window.location.origin : ""
                    }/checkout/success?session_id=${stripeSecret.split("_secret")[0]}`}
                    onCompleted={() => {
                      clearCart();
                      setStep(2);
                    }}
                    onError={setPaymentError}
                  />
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="animate-fade-up space-y-10">
              <div className="grid gap-px border border-ink/12 bg-ink/12 sm:grid-cols-2">
                <div className="bg-bone p-6">
                  <p className="eyebrow text-ink-300">Delivering to</p>
                  <p className="mt-3 text-[14px] leading-relaxed">
                    {form.fullName}
                    <br />
                    {form.address1}
                    {form.address2 ? `, ${form.address2}` : ""}
                    <br />
                    {form.city}
                    {form.region ? `, ${form.region}` : ""} {form.postalCode}
                    <br />
                    {form.country}
                  </p>
                  <p className="mt-3 text-[12.5px] text-ink-300">{form.email}</p>
                </div>
                <div className="bg-bone p-6">
                  <p className="eyebrow text-ink-300">Delivery &amp; payment</p>
                  <p className="mt-3 text-[14px] leading-relaxed">
                    {method.label}
                    <br />
                    {method.eta}
                  </p>
                  <p className="mt-3 text-[12.5px] text-ink-300">
                    Card payment — taken on Stripe&#39;s secure page
                  </p>
                  {promo && discountCents > 0 && (
                    <p className="mt-3 text-[12.5px]">
                      <span className="font-mono tracking-[0.08em]">{promo.code}</span>{" "}
                      <span className="text-ink-300">— {promo.summary}</span>
                    </p>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-ink/10 border-y border-ink/12">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-center gap-4 py-5">
                    <div className="relative h-[84px] w-[64px] shrink-0 overflow-hidden bg-bone-dark">
                      <Image src={line.image} alt={line.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px]">{line.name}</p>
                      <p className="mt-1 text-[11.5px] uppercase tracking-[0.12em] text-ink-300">
                        {line.color}
                        {line.size ? ` · ${line.size}` : ""} · Qty {line.quantity}
                      </p>
                    </div>
                    <p className="text-[14.5px]">
                      <Price cents={line.priceCents * line.quantity} />
                    </p>
                  </li>
                ))}
              </ul>

              <p className="text-[12.5px] leading-relaxed text-ink-300">
                By placing this order you agree to our terms of sale. You will receive a confirmation
                email with a DHL tracking link the moment your parcel leaves the atelier.
              </p>
            </section>
          )}

          {error && <p className="mt-8 text-[13px] text-ember">{error}</p>}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="link-underline text-[11.5px] uppercase tracking-[0.18em] text-ink-300"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={next}
                className="bg-ink px-10 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={placeOrder}
                disabled={submitting}
                className="flex items-center gap-3 bg-ink px-10 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700 disabled:opacity-60"
              >
                {submitting && <Spinner />}
                {submitting ? "Placing order" : "Place order · "}
                {!submitting && <Price cents={totalCents} />}
              </button>
            )}
          </div>
        </div>

        {/* --------------------------------------------------------- summary */}
        <aside className="lg:sticky lg:top-[96px] lg:self-start">
          <div className="border border-sand bg-linen p-6 md:p-7">
            <p className="eyebrow text-ink-300">Order summary</p>
            <ul className="mt-6 space-y-5">
              {lines.map((line) => (
                <li key={line.key} className="flex items-start gap-4">
                  <div className="relative h-[76px] w-[58px] shrink-0 overflow-hidden bg-bone-dark">
                    <Image src={line.image} alt={line.name} fill sizes="58px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug">{line.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-ink-300">
                      {line.color}
                      {line.size ? ` · ${line.size}` : ""}
                    </p>
                    <p className="mt-1.5 text-[12px] text-ink-300">Qty {line.quantity}</p>
                  </div>
                  <p className="text-[13.5px]">
                    <Price cents={line.priceCents * line.quantity} />
                  </p>
                </li>
              ))}
            </ul>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await applyPromo(codeInput);
                if (ok) setCodeInput("");
              }}
              className="mt-7 border-t border-ink/12 pt-5"
            >
              {promo ? (
                <div className="flex items-center justify-between gap-3 border border-brass/45 bg-brass/10 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[12.5px] tracking-[0.08em]">{promo.code}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-300">{promo.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPromo}
                    className="link-underline shrink-0 text-[11px] uppercase tracking-[0.14em] text-ink-300"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border border-ink/15 px-3 py-2.5 focus-within:border-ink">
                    <input
                      value={codeInput}
                      onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                      placeholder="Promotional code"
                      aria-label="Promotional code"
                      className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] uppercase tracking-[0.08em] outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-300"
                    />
                    <button
                      type="submit"
                      disabled={!codeInput.trim()}
                      className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] transition-opacity hover:opacity-60 disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="mt-2 text-[12px] text-ember">{promoError}</p>}
                </>
              )}
            </form>

            <dl className="mt-5 space-y-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-ink-300">Subtotal</dt>
                <dd>
                  <Price cents={subtotalCents} />
                </dd>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-brass">
                  <dt>Discount</dt>
                  <dd>
                    −<Price cents={discountCents} />
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-300">Shipping</dt>
                <dd>{shippingCents === 0 ? "Complimentary" : <Price cents={shippingCents} />}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-300">Duties &amp; taxes</dt>
                <dd className="text-ink-300">Included</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-ink/12 pt-4">
                <dt className="text-[15px]">Total</dt>
                <dd className="text-2xl">
                  <Price cents={totalCents} />
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-[11.5px] leading-relaxed text-ink-300">
              Prices shown in your selected display currency. Orders are settled in USD at your bank&apos;s
              rate.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow flex items-baseline justify-between text-ink-300">
        {label}
        {hint && <span className="ml-3 text-[10.5px] normal-case tracking-normal opacity-80">{hint}</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border border-ink/15 bg-transparent px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
      />
    </label>
  );
}
