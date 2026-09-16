import Stripe from "stripe";

/**
 * Stripe integration.
 *
 * We use Stripe Checkout — the hosted payment page — so card details never
 * touch this server. That keeps the store in Stripe's simplest PCI scope
 * (SAQ-A) and means no card data is ever stored, logged or transmitted by us.
 *
 * Until STRIPE_SECRET_KEY is set the storefront keeps its demo checkout, so
 * the store still works before payments are switched on.
 */

const globalForStripe = globalThis as typeof globalThis & {
  __novaStripe?: Stripe;
};

export const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";

export const stripeEnabled = stripeSecret.startsWith("sk_");

export function getStripe(): Stripe {
  if (!globalForStripe.__novaStripe) {
    globalForStripe.__novaStripe = new Stripe(stripeSecret);
  }
  return globalForStripe.__novaStripe;
}

/* The catalogue is held in USD cents; Stripe expects decimal units. */
export function toStripeAmount(cents: number, currency = "usd") {
  const zeroDecimal = currency === "jpy";
  return zeroDecimal ? Math.round(cents) : Math.round(cents);
}

export function stripeCurrency(code: string) {
  return (code || "usd").toLowerCase();
}

/** Verifies a webhook signature without throwing on a bad payload. */
export function constructWebhookEvent(payload: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) return null;
  try {
    return getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}
