import { desc } from "drizzle-orm";

import { db } from "@/db";
import { giftCards } from "@/db/schema";
import { formatUsd } from "@/lib/currency";

import { createGiftCardAction, toggleGiftCardAction, topUpGiftCardAction } from "../actions";
import { requireManagerPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

export default async function AdminGiftCards() {
  await requireManagerPage();
  const cards = await db.select().from(giftCards).orderBy(desc(giftCards.createdAt)).limit(200);
  const outstanding = cards
    .filter((card) => card.active)
    .reduce((total, card) => total + card.balanceCents, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6">
        <div>
          <p className="eyebrow text-sage">Client care</p>
          <h1 className="mt-2 text-3xl">Gift cards</h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
            Issue a code with a balance. Clients redeem it in the promo field at checkout and the
            balance is spent down automatically.
          </p>
        </div>
        <p className="text-[13px] text-ink-300">
          <span className="text-ink">{formatUsd(outstanding)}</span> outstanding · {cards.length}{" "}
          cards
        </p>
      </header>

      <form action={createGiftCardAction} className="border border-sand bg-linen p-6 md:p-8">
        <p className="eyebrow text-ink-300">Issue a gift card</p>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <label className="block">
            <span className={label}>Amount (USD cents)</span>
            <input
              name="amount"
              type="number"
              min={1000}
              step={500}
              defaultValue={10000}
              required
              className={field}
            />
            <span className="mt-2 block text-[11.5px] text-ink-300">10000 = $100</span>
          </label>
          <label className="block">
            <span className={label}>Custom code (optional)</span>
            <input name="code" placeholder="NOVAGC-XXXXXX" className={field} />
            <span className="mt-2 block text-[11.5px] text-ink-300">
              Leave blank and we generate one.
            </span>
          </label>
          <label className="block">
            <span className={label}>Note</span>
            <input name="note" placeholder="Press, apology, loyalty" className={field} />
          </label>
        </div>
        <button
          type="submit"
          className="mt-6 bg-ink px-9 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
        >
          Create card
        </button>
      </form>

      {cards.length === 0 ? (
        <div className="border border-dashed border-ink/20 px-6 py-20 text-center">
          <p className="font-display text-2xl">No gift cards yet</p>
          <p className="mt-3 text-[13.5px] text-ink-300">Issue the first one above.</p>
        </div>
      ) : (
        <div className="border border-sand bg-linen">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-mono text-[13.5px] tracking-[0.08em]">{card.code}</p>
                <p className="mt-1 text-[12px] text-ink-300">
                  {formatUsd(card.balanceCents)} left of {formatUsd(card.initialCents)}
                  {card.note ? ` · ${card.note}` : ""} ·{" "}
                  {card.active ? "Active" : "Deactivated"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={topUpGiftCardAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={card.id} />
                  <input
                    name="amount"
                    type="number"
                    min={500}
                    step={500}
                    placeholder="+ cents"
                    className="w-28 border border-ink/15 bg-bone px-3 py-2 text-[13px] outline-none focus:border-ink"
                  />
                  <button
                    type="submit"
                    className="border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
                  >
                    Top up
                  </button>
                </form>

                <form action={toggleGiftCardAction}>
                  <input type="hidden" name="id" value={card.id} />
                  <button
                    type="submit"
                    className={`px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      card.active
                        ? "border border-ink/15 text-ink-300 hover:border-ink"
                        : "bg-ink text-bone hover:bg-ink-700"
                    }`}
                  >
                    {card.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
