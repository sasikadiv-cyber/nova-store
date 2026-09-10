import { SubmitButton } from "@/components/admin/submit-button";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getPaymentMethods } from "@/lib/customer-queries";
import {
  addPaymentMethodAction,
  deletePaymentMethodAction,
  setDefaultPaymentAction,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payment methods" };

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

const BRAND_MARK: Record<string, string> = {
  Visa: "VISA",
  Mastercard: "MC",
  Amex: "AMEX",
  Card: "CARD",
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const customer = await getCurrentCustomer();
  if (!customer) return null;

  const cards = await getPaymentMethods(customer.id);
  const thisYear = new Date().getFullYear();

  return (
    <div>
      <p className="eyebrow text-sage">Checkout</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Payment methods</h1>
      <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
        Cards are saved with only the brand, last four digits and expiry — the full number and CVC
        are never stored, exactly as a real checkout provider would handle it.
      </p>

      {params.error && (
        <p className="mt-6 border-l-2 border-ember bg-linen px-4 py-3 text-[13px] text-ember">
          {params.error}
        </p>
      )}
      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Card details updated.
        </p>
      )}

      {cards.length === 0 ? (
        <p className="mt-8 border border-dashed border-sand bg-linen px-5 py-12 text-center text-[13.5px] text-ink-300">
          No cards on file yet — add one below to check out in a couple of taps.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className={`border bg-linen p-5 ${card.isDefault ? "border-brass" : "border-sand"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="border border-ink/20 px-2 py-1 text-[10px] tracking-[0.14em]">
                      {BRAND_MARK[card.brand] ?? card.brand.toUpperCase()}
                    </span>
                    {card.isDefault && (
                      <span className="bg-brass/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brass">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-[16px] tracking-[0.14em]">
                    •••• •••• •••• {card.last4}
                  </p>
                  <p className="mt-2 text-[12px] text-ink-300">
                    Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {!card.isDefault && (
                  <form action={setDefaultPaymentAction}>
                    <input type="hidden" name="id" value={card.id} />
                    <SubmitButton
                      label="Make default"
                      pendingLabel="Saving"
                      className="border border-ink/15 px-4 py-2 text-[10.5px] uppercase tracking-[0.14em] transition-colors hover:bg-ink hover:text-bone"
                    />
                  </form>
                )}
                <form action={deletePaymentMethodAction}>
                  <input type="hidden" name="id" value={card.id} />
                  <SubmitButton
                    label="Remove"
                    pendingLabel="Removing"
                    className="border border-ember/50 px-4 py-2 text-[10.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-bone"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 border border-sand bg-linen p-6">
        <h2 className="text-2xl">Add a card</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
          Try 4242 4242 4242 4242 with any future expiry — this is a demonstration storefront and no
          charge is ever made.
        </p>

        <form action={addPaymentMethodAction} className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Card number</span>
            <input
              name="cardNumber"
              required
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              className={`${field} font-mono`}
            />
          </label>

          <label className="block">
            <span className={label}>Expiry month</span>
            <input
              name="expMonth"
              type="number"
              min={1}
              max={12}
              required
              defaultValue={12}
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Expiry year</span>
            <input
              name="expYear"
              type="number"
              min={thisYear}
              max={thisYear + 15}
              required
              defaultValue={thisYear + 3}
              className={field}
            />
          </label>

          <div className="sm:col-span-2">
            <SubmitButton
              label="Add card"
              pendingLabel="Saving card"
              className="bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
            />
          </div>
        </form>
      </section>
    </div>
  );
}
