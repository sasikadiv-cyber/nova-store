"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The payment overlay, rendered as a page-level popup.
 *
 * It is mounted through a portal onto <body> rather than inside the payment
 * form, so it is laid over the whole page — header, checkout columns and all
 * — exactly like the site's other popups, and no ancestor (a transform, a
 * filter, a stacking context) can clip or capture it. While a payment is in
 * flight it cannot be dismissed: closing the window mid-confirmation is how
 * double charges and lost orders happen.
 */
export function PaymentOverlay({
  stage,
  successUrl,
  onProceed,
}: {
  stage: "idle" | "processing" | "succeeded";
  successUrl: string;
  onProceed: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Keep the page behind still while the payment is being confirmed. */
  useEffect(() => {
    if (stage === "idle") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [stage]);

  if (!mounted || stage === "idle") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={stage === "processing" ? "Processing payment" : "Payment successful"}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-scrim/75 p-5 backdrop-blur-sm sm:p-6"
    >
      {stage === "processing" ? (
        <div className="flex w-full max-w-[400px] flex-col items-center border border-sand bg-linen px-8 py-12 text-center shadow-lift">
          <span className="relative grid h-14 w-14 place-items-center">
            <span className="absolute inset-0 animate-spin rounded-full border border-ink/15 border-t-ink" />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-ink"
            >
              <rect x="3" y="6" width="18" height="12" rx="1.5" />
              <path d="M3 10h18" />
            </svg>
          </span>
          <p className="eyebrow mt-7 text-ink-300">Do not close this window</p>
          <h2 className="mt-3 font-display text-[26px] leading-tight">Processing payment</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
            Confirming your card with Stripe and reserving your pieces. This takes a moment.
          </p>
          <span className="mt-7 h-px w-full overflow-hidden bg-sand">
            <span className="block h-px w-1/3 animate-[loading_1.1s_ease-in-out_infinite] bg-ink" />
          </span>
        </div>
      ) : (
        <div className="animate-fade-up flex w-full max-w-[420px] flex-col items-center border border-sand bg-linen px-8 py-12 text-center shadow-lift">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-ok/40 bg-ok/10 text-ok">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </span>
          <p className="eyebrow mt-7 text-ok">Payment received</p>
          <h2 className="mt-3 font-display text-[30px] leading-tight">
            Your payment was successful
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
            Thank you — your order is confirmed and a receipt is on its way to your inbox. Your
            tracking link appears with your order.
          </p>
          <button
            type="button"
            autoFocus
            onClick={onProceed}
            className="mt-8 w-full bg-ink py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
          >
            View my order
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="link-underline mt-4 text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            Close
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
