export const dynamic = "force-dynamic";

/**
 * Orders are created by /api/checkout/session (as `pending_payment`) and
 * confirmed by the Stripe webhook once the charge succeeds. There is no demo
 * checkout: an order can only exist alongside a real Stripe payment attempt.
 */
export async function POST() {
  return Response.json(
    { ok: false, error: "Checkout runs through Stripe. Start from the bag." },
    { status: 410 },
  );
}
