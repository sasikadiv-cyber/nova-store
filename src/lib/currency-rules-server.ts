import { cache } from "react";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { currencyRules } from "@/db/schema";
import { CURRENCIES, type CurrencyCode } from "./currency";
import { DEFAULT_CURRENCY_RULES, type CurrencyRuleConfig, type CurrencyRuleMap } from "./currency-rules";

/** Reads the owner's pricing rules, falling back to the built-in rates. */
async function readCurrencyRuleMap(): Promise<CurrencyRuleMap> {
  try {
    const rows = await db.select().from(currencyRules).orderBy(asc(currencyRules.code));
    const map: CurrencyRuleMap = {};
    for (const row of rows) {
      map[row.code] = {
        code: row.code,
        fxRate: row.fxRate,
        markupPercent: row.markupPercent,
        rounding: (["none", "nearest_5", "nearest_9", "nearest_10"].includes(row.rounding)
          ? row.rounding
          : "none") as CurrencyRuleConfig["rounding"],
        active: row.active,
      };
    }
    for (const rule of DEFAULT_CURRENCY_RULES) {
      if (!map[rule.code]) map[rule.code] = rule;
    }
    return map;
  } catch {
    const map: CurrencyRuleMap = {};
    for (const rule of DEFAULT_CURRENCY_RULES) map[rule.code] = rule;
    return map;
  }
}

/** Every supported currency with its rule, so the console can edit them all. */
export async function getCurrencyRuleList(): Promise<CurrencyRuleConfig[]> {
  const map = await getCurrencyRuleMap();
  return (Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => map[code]);
}

/** De-duplicated per render — layout and pages share one read. */
export const getCurrencyRuleMap = cache(readCurrencyRuleMap);
