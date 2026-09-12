import { getCurrencyRuleList } from "@/lib/currency-rules-server";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/currency";
import { ROUNDING_OPTIONS } from "@/lib/currency-rules";

import { saveCurrencyRuleAction } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

export default async function AdminCurrency() {
  const rules = await getCurrencyRuleList();

  return (
    <div className="space-y-8">
      <header className="border-b border-sand pb-6">
        <p className="eyebrow text-sage">Pricing</p>
        <h1 className="mt-2 text-3xl">Currency pricing rules</h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-300">
          Override the exchange rate per currency, add a market markup, and round prices so they
          read well locally. Catalogue prices stay in USD — only the display changes.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        {rules.map((rule) => {
          const code = rule.code as CurrencyCode;
          const meta = CURRENCIES[code];
          return (
            <form key={rule.code} action={saveCurrencyRuleAction} className="border border-sand bg-linen p-6">
              <input type="hidden" name="code" value={rule.code} />

              <div className="flex items-baseline justify-between">
                <p className="text-[16px]">
                  {rule.code} <span className="text-ink-300">· {meta?.region}</span>
                </p>
                <p className="text-[12px] text-ink-300">
                  Base rate {meta?.rate ?? 1} · {formatMoney(10000, code)} for $100
                </p>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <label className="block">
                  <span className={label}>FX rate</span>
                  <input
                    name="fxRate"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    defaultValue={rule.fxRate}
                    required
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Markup %</span>
                  <input
                    name="markupPercent"
                    type="number"
                    step="0.1"
                    defaultValue={rule.markupPercent}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Rounding</span>
                  <select name="rounding" defaultValue={rule.rounding} className={field}>
                    {ROUNDING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-ink">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={rule.active}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className="text-[13px]">Use these rules</span>
                </label>
                <button
                  type="submit"
                  className="bg-ink px-7 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
                >
                  Save
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
