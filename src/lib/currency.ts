export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "AED" | "CAD" | "AUD";

export type CurrencyMeta = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  rate: number;
  locale: string;
  region: string;
};

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", label: "USD", symbol: "$", rate: 1, locale: "en-US", region: "United States" },
  EUR: { code: "EUR", label: "EUR", symbol: "€", rate: 0.92, locale: "de-DE", region: "Europe" },
  GBP: { code: "GBP", label: "GBP", symbol: "£", rate: 0.79, locale: "en-GB", region: "United Kingdom" },
  JPY: { code: "JPY", label: "JPY", symbol: "¥", rate: 152, locale: "ja-JP", region: "Japan" },
  AED: { code: "AED", label: "AED", symbol: "AED", rate: 3.67, locale: "en-AE", region: "UAE" },
  CAD: { code: "CAD", label: "CAD", symbol: "CA$", rate: 1.36, locale: "en-CA", region: "Canada" },
  AUD: { code: "AUD", label: "AUD", symbol: "A$", rate: 1.52, locale: "en-AU", region: "Australia" },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return !!value && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

/** Format a USD-cent amount into the chosen display currency. */
export function formatMoney(cents: number, code: CurrencyCode = "USD") {
  const currency = CURRENCIES[code];
  const converted = (cents / 100) * currency.rate;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: currency.code === "JPY" ? 0 : converted % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(Math.round(converted * (currency.code === "JPY" ? 1 : 100)) / 100);
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
