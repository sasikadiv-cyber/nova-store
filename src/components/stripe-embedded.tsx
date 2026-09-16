"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Stripe's Payment Element, mounted inside our own checkout page so the client
 * pays without leaving the store. Card details are typed directly into an
 * iframe Stripe hosts, so they never touch this server.
 */
export function StripeEmbedded({
  clientSecret,
  returnPath,
  onCompleted,
  onError,
}: {
  clientSecret: string;
  returnPath: string;
  onCompleted?: () => void;
  onError: (message: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
      if (!publishable) {
        onError(
          "Payments are not fully configured — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
        );
        return;
      }

      stripePromise = stripePromise ?? loadStripe(publishable);
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;

      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#17150f",
            colorBackground: "#fcfbf8",
            colorText: "#17150f",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "0px",
          },
        },
      });
      elementsRef.current = elements;

      const payment = elements.create("payment");
      if (cancelled) return;
      if (holderRef.current) payment.mount(holderRef.current);
      payment.on("ready", () => setReady(true));
    })();

    return () => {
      cancelled = true;
    };
  }, [clientSecret, onError]);

  async function pay() {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;

    setSubmitting(true);
    onError("");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnPath },
    });

    /* A redirect means success; anything else is a message for the client. */
    if (result.error) {
      onError(result.error.message ?? "Payment could not be completed.");
      setSubmitting(false);
      return;
    }

    onCompleted?.();
  }

  return (
    <div className="space-y-5">
      {!ready && (
        <div className="flex items-center justify-center gap-3 border border-sand bg-linen px-6 py-12">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink/40 border-t-transparent" />
          <span className="text-[13px] text-ink-300">Loading secure payment…</span>
        </div>
      )}

      <div ref={holderRef} />

      <button
        type="button"
        onClick={pay}
        disabled={!ready || submitting}
        className={`w-full bg-ink py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700 ${
          !ready || submitting ? "cursor-wait opacity-60" : ""
        }`}
      >
        {submitting ? "Processing…" : "Pay securely"}
      </button>

      <p className="text-center text-[11.5px] leading-relaxed text-ink-300">
        Card details are entered into Stripe&#39;s secure form and never reach this store.
      </p>
    </div>
  );
}
