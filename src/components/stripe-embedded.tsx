"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeCheckoutElementsSdk,
} from "@stripe/stripe-js";

import { PaymentOverlay } from "./payment-overlay";

let stripePromise: Promise<Stripe | null> | null = null;

/* Shared constructor options — loadStripe only honours the options from the
 * first call for a given key, so every initializer must use the same set. */
const STRIPE_OPTIONS = {
  /* Keep the test-mode developer side badge out of the checkout UI — it is
     tooling for developers, not something a client should see mid-payment. */
  developerTools: {
    assistant: {
      enabled: false,
    },
  },
};

/**
 * Warm the Stripe.js connection early in the session. The script and its
 * controller usually take a couple of round trips, so the checkout page
 * starts the download the moment it mounts — by the time the client reaches
 * the payment step the script is already loaded and shared with the element
 * below, instead of blocking its render.
 */
export function prepareStripe() {
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  if (!publishable || typeof window === "undefined") return;
  stripePromise = stripePromise ?? loadStripe(publishable, STRIPE_OPTIONS);
  /* Attach a noop catch so an offline client never surfaces an unhandled
     rejection before the payment step even exists. */
  void stripePromise.catch(() => null);
}

/**
 * Stripe's Checkout Sessions API with the Elements integration, styled to the
 * house: the payment form is rendered as embeddable elements instead of
 * Stripe's fixed embedded page, so canvas (linen), ink, borders and capital
 * eyebrow labels follow the storefront theme exactly. Card details are typed
 * into Stripe-hosted iframes and never touch this server.
 */
const NOVA_LIGHT_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#17150f",
    colorBackground: "#fcfbf8",
    colorText: "#17150f",
    colorTextSecondary: "#4d4840",
    colorTextPlaceholder: "#8c857b",
    colorIcon: "#8c857b",
    colorDanger: "#7c2b2b",
    colorSuccess: "#3f7a4c",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontLineHeight: "1.5",
    fontSizeBase: "13.5px",
    fontSizeSm: "12px",
    borderRadius: "0px",
    spacingUnit: "4px",
    spacingGridRow: "20px",
  },
  rules: {
    ".Input": {
      backgroundColor: "transparent",
      border: "1px solid rgba(23,21,15,0.16)",
      boxShadow: "none",
      padding: "12px 14px",
    },
    ".Input:hover": { border: "1px solid rgba(23,21,15,0.4)" },
    ".Input:focus": {
      border: "1px solid #17150f",
      boxShadow: "none",
      outline: "none",
    },
    ".Input::placeholder": { color: "#8c857b" },
    ".Label": {
      color: "#8c857b",
      fontSize: "10.5px",
      fontWeight: "500",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      marginBottom: "8px",
    },
    ".Tab": {
      backgroundColor: "transparent",
      border: "1px solid rgba(23,21,15,0.16)",
      borderRadius: "0px",
      boxShadow: "none",
    },
    ".Tab:hover": { border: "1px solid rgba(23,21,15,0.45)" },
    ".Tab--selected": {
      backgroundColor: "rgba(23,21,15,0.035)",
      border: "1px solid #17150f",
      borderRadius: "0px",
      boxShadow: "none",
    },
    ".TabIcon": { color: "#8c857b" },
    ".TabIcon--selected": { color: "#17150f" },
    ".TabLabel": { fontWeight: "500", letterSpacing: "0.02em" },
    ".Block": {
      backgroundColor: "#f7f4ef",
      border: "1px solid #e5ded3",
      borderRadius: "0px",
      boxShadow: "none",
    },
    ".BlockDivider": { backgroundColor: "#e5ded3" },
    ".CheckboxInput": {
      border: "1px solid rgba(23,21,15,0.3)",
      borderRadius: "0px",
    },
    ".CheckboxInput--checked": {
      backgroundColor: "#17150f",
      border: "1px solid #17150f",
    },
    ".Error": { color: "#7c2b2b", fontSize: "12px" },
    ".RedirectText": { color: "#4d4840", fontSize: "12.5px" },
  },
};

/* The same design in the dark theme — mirrors globals.css
   [data-theme="dark"] tokens exactly, so the payment form is fully legible
   (dark canvas, ivory text, taupe icons) instead of the washed-out light
   palette that used to render on the dark checkout page. */
const NOVA_DARK_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#f1ede5",
    colorBackground: "#16140f",
    colorText: "#f1ede5",
    colorTextSecondary: "#c6bfb4",
    colorTextPlaceholder: "#948d81",
    colorIcon: "#948d81",
    colorDanger: "#cf8a79",
    colorSuccess: "#7fbe8d",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontLineHeight: "1.5",
    fontSizeBase: "13.5px",
    fontSizeSm: "12px",
    borderRadius: "0px",
    spacingUnit: "4px",
    spacingGridRow: "20px",
  },
  rules: {
    ".Input": {
      backgroundColor: "#1d1a15",
      border: "1px solid rgba(241,237,229,0.18)",
      boxShadow: "none",
      color: "#f1ede5",
      padding: "12px 14px",
    },
    ".Input:hover": { border: "1px solid rgba(241,237,229,0.42)" },
    ".Input:focus": {
      border: "1px solid #f1ede5",
      boxShadow: "none",
      outline: "none",
    },
    ".Input::placeholder": { color: "#948d81" },
    ".Label": {
      color: "#948d81",
      fontSize: "10.5px",
      fontWeight: "500",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      marginBottom: "8px",
    },
    ".Tab": {
      backgroundColor: "#1d1a15",
      border: "1px solid rgba(241,237,229,0.18)",
      borderRadius: "0px",
      boxShadow: "none",
      color: "#c6bfb4",
    },
    ".Tab:hover": { border: "1px solid rgba(241,237,229,0.45)" },
    ".Tab--selected": {
      backgroundColor: "rgba(241,237,229,0.06)",
      border: "1px solid #f1ede5",
      borderRadius: "0px",
      boxShadow: "none",
      color: "#f1ede5",
    },
    ".TabIcon": { color: "#948d81" },
    ".TabIcon--selected": { color: "#f1ede5" },
    ".TabLabel": { fontWeight: "500", letterSpacing: "0.02em" },
    ".Block": {
      backgroundColor: "#241f19",
      border: "1px solid #2b2620",
      borderRadius: "0px",
      boxShadow: "none",
    },
    ".BlockDivider": { backgroundColor: "#2b2620" },
    ".CheckboxInput": {
      backgroundColor: "#1d1a15",
      border: "1px solid rgba(241,237,229,0.32)",
      borderRadius: "0px",
    },
    ".CheckboxInput--checked": {
      backgroundColor: "#f1ede5",
      border: "1px solid #f1ede5",
    },
    ".Error": { color: "#cf8a79", fontSize: "12px" },
    ".RedirectText": { color: "#c6bfb4", fontSize: "12.5px" },
  },
} as typeof NOVA_LIGHT_APPEARANCE;

export function StripeEmbedded({
  clientSecret,
  returnPath,
  onConfirmed,
  onLeave,
  onError,
}: {
  clientSecret: string;
  returnPath: string;
  /** The charge went through — keep this component mounted for the popup. */
  onConfirmed?: () => void;
  /** Called only as the client leaves for the receipt page. */
  onLeave?: () => void;
  onError: (message: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<StripeCheckoutElementsSdk | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /* The payment form must follow the storefront theme — in dark mode the
     light appearance leaves ivory labels on an ivory canvas. "light" is the
     SSR-safe starting point; the real theme is read in an effect below. */
  const [theme, setTheme] = useState<"light" | "dark">("light");

  /* Track <html data-theme> so a mid-checkout theme toggle re-styles the
     payment form too. */
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    const frame = requestAnimationFrame(read);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  /* The payment overlay walks through its own little flow so the client is
     never left staring at a frozen form: processing → paid → receipt page. */
  const [stage, setStage] = useState<"idle" | "processing" | "succeeded">("idle");
  const [successUrl, setSuccessUrl] = useState("");

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

      /* Should already be warm from prepareStripe() on the checkout page;
         this just joins the same promise. */
      stripePromise = stripePromise ?? loadStripe(publishable, STRIPE_OPTIONS);
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;

      let sdk: StripeCheckoutElementsSdk;
      try {
        /* Elements-with-Checkout-Sessions: the session owns pricing and
           payment methods, we own the look. Initialisation is synchronous —
           a bad session throws immediately. */
        sdk = stripe.initCheckoutElementsSdk({
          clientSecret,
          elementsOptions: {
            loader: "auto",
            appearance: theme === "dark" ? NOVA_DARK_APPEARANCE : NOVA_LIGHT_APPEARANCE,
          },
        });
      } catch {
        if (!cancelled) {
          onError("Could not load the secure payment form. Please try again.");
        }
        return;
      }

      if (cancelled || !holderRef.current) return;
      sdkRef.current = sdk;

      try {
        const payment = sdk.createPaymentElement({ layout: "tabs" });
        payment.mount(holderRef.current);
        payment.on("ready", () => {
          if (!cancelled) setReady(true);
        });
        payment.on("loaderror", () => {
          if (!cancelled) {
            onError("The payment form could not load. Please refresh and try again.");
          }
        });
      } catch {
        if (!cancelled) {
          onError("The payment form could not load. Please refresh and try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
      sdkRef.current = null;
    };
    /* The element remounts when the theme flips so Stripe re-renders the
       iframes with the matching palette. */
  }, [clientSecret, onError, theme]);

  async function pay() {
    const sdk = sdkRef.current;
    if (!sdk) return;

    setSubmitting(true);
    setStage("processing");
    onError("");

    try {
      const loaded = await sdk.loadActions();
      if (loaded.type !== "success") {
        onError("Payments could not be initialised — please try again.");
        setSubmitting(false);
        setStage("idle");
        return;
      }

      /* `if_required`: cards that need no extra step settle in place and we
         move on ourselves; anything needing a redirect (3-D Secure, wallets,
         bank apps) leaves for the provider and returns via the session's
         return_url. Note: confirm() rejects if returnUrl is passed here —
         the Checkout Session already owns it (set at creation, with the
         {CHECKOUT_SESSION_ID} template Stripe substitutes). */
      const confirmation = await loaded.actions.confirm({
        redirect: "if_required",
      });

      if (confirmation.type === "error") {
        console.error("[nova] checkout confirm rejected:", confirmation.error);
        const failure = confirmation.error;
        onError(
          failure.code === "paymentFailed"
            ? `${failure.message}${
                failure.paymentFailed.declineCode
                  ? ` (${failure.paymentFailed.declineCode})`
                  : ""
              }`
            : failure.message || "Payment could not be completed.",
        );
        setSubmitting(false);
        setStage("idle");
        return;
      }

      /* Tell the page the charge succeeded, but do NOT empty the bag yet:
         clearing it here would re-render the checkout into its empty state,
         unmount this component and take the success popup with it. The bag
         is emptied as the client leaves for the receipt instead. */
      onConfirmed?.();
      /* Prefer the session id Stripe just returned over the client-secret
         prefix — same value, but this cannot drift if the secret format
         ever changes. */
      const sessionId = confirmation.session.id;
      const destination = sessionId
        ? `${window.location.origin}/checkout/success?session_id=${sessionId}`
        : returnPath;

      /* Confirm the good news in place first; the receipt page is one click
         away rather than an abrupt redirect. */
      setSuccessUrl(destination);
      setStage("succeeded");
    } catch (thrown) {
      /* Keep the real reason visible — Stripe usually resolves typed errors,
         so a throw here means something environmental (frame messaging,
         network) that we need to see to fix. */
      console.error("[nova] checkout confirm threw:", thrown);
      const detail =
        thrown instanceof Error
          ? thrown.message || thrown.name
          : String(thrown);
      onError(
        detail
          ? `Payment could not be completed — ${detail}`
          : "Payment could not be completed. Please try again.",
      );
      setSubmitting(false);
      setStage("idle");
    }
  }

  function openReceipt() {
    if (!successUrl) return;
    /* Now the bag can be emptied: we are leaving this page, so nothing can
       unmount the popup mid-farewell. */
    onLeave?.();
    /* Replace, so the back button cannot return to a spent payment form. */
    window.location.replace(successUrl);
  }

  return (
    <div className="space-y-5">
      {!ready && (
        <div className="flex items-center justify-center gap-3 border border-sand bg-linen px-6 py-12">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink/40 border-t-transparent" />
          <span className="text-[13px] text-ink-300">Loading secure payment…</span>
        </div>
      )}

      <div className="border border-sand bg-linen p-5 md:p-6" ref={holderRef} />

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
        Card details are entered into Stripe&#39;s secure fields and never reach this store.
      </p>

      {/* The processing/success popup lives at page level through a portal,
          so it covers the whole page rather than the payment column. */}
      <PaymentOverlay stage={stage} successUrl={successUrl} onProceed={openReceipt} />
    </div>
  );
}
