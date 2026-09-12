import { CURRENCIES, formatMoney, type CurrencyCode } from "./currency";

/* Client-safe — no database imports, so the store provider can use it. */

export type CurrencyRuleConfig = {
  code: string;
  fxRate: number;
  markupPercent: number;
  rounding: "none" | "nearest_5" | "nearest_9" | "nearest_10";
  active: boolean;
};

export type CurrencyRuleMap = Record<string, CurrencyRuleConfig>;

export const ROUNDING_OPTIONS: { value: CurrencyRuleConfig["rounding"]; label: string }[] = [
  { value: "none", label: "No rounding" },
  { value: "nearest_5", label: "Nearest 5" },
  { value: "nearest_9", label: "Ends in 9" },
  { value: "nearest_10", label: "Nearest 10" },
];

/** Sensible starting rules, seeded once and then edited from the console. */
export const DEFAULT_CURRENCY_RULES: CurrencyRuleConfig[] = (
  Object.keys(CURRENCIES) as CurrencyCode[]
).map((code) => ({
  code,
  fxRate: CURRENCIES[code].rate,
  markupPercent: 0,
  rounding: "none",
  active: true,
}));

function roundValue(value: number, rounding: CurrencyRuleConfig["rounding"], zeroDecimals: boolean) {
  if (rounding === "none") return value;
  const units = zeroDecimals ? value : value;
  switch (rounding) {
    case "nearest_5":
      return Math.round(units / 5) * 5;
    case "nearest_10":
      return Math.round(units / 10) * 10;
    case "nearest_9": {
      const whole = Math.round(units);
      return Math.round((whole - 9) / 10) * 10 + 9;
    }
    default:
      return value;
  }
}

/**
 * Converts a USD-cent amount using the owner's rules for that currency —
 * the FX rate can be overridden, a markup added, and the result rounded to a
 * price that reads well in that market.
 */
export function priceWithRules(
  cents: number,
  code: CurrencyCode,
  rules: CurrencyRuleMap | null | undefined,
) {
  const rule = rules?.[code];
  const base = CURRENCIES[code];

  if (!rule || !rule.active) {
    return formatMoney(cents, code);
  }

  const zeroDecimals = code === "JPY";
  const converted = (cents / 100) * rule.fxRate * (1 + rule.markupPercent / 100);
  const rounded = zeroDecimals ? Math.round(roundValue(converted, rule.rounding, true)) : converted;

  if (zeroDecimals) {
    return new Intl.NumberFormat(base.locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(rounded);
  }

  return new Intl.NumberFormat(base.locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: converted % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(Math.round(rounded * 100) / 100);
}
