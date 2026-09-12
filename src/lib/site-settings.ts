import { sql } from "drizzle-orm";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { SETTING_DEFAULTS, type SettingKey, type SiteAppearance } from "./appearance-schema";

export * from "./appearance-schema";

/**
 * Self-healing table check.
 *
 * The settings are saved in `site_settings`. On a brand-new or reset database
 * that table may not exist yet, which used to make every save fail with
 * "relation does not exist". To make the appearance editor work against ANY
 * database the app points at, the table is created on first use.
 */
let tableChecked = false;

async function ensureSettingsTable(): Promise<void> {
  if (tableChecked) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key        text PRIMARY KEY,
      value      text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  tableChecked = true;
}

/** If a settings query ever fails (e.g. the table was dropped), forget the
    cache so the next call re-creates the table and retries. */
function invalidateTableCheck() {
  tableChecked = false;
}

/** Reads every setting, falling back to the defaults for anything missing. */
export async function getAppearance(): Promise<SiteAppearance> {
  const result: SiteAppearance = { ...SETTING_DEFAULTS };
  try {
    await ensureSettingsTable();
    const rows = await db.select().from(siteSettings);
    for (const row of rows) {
      if (row.key in SETTING_DEFAULTS && row.value.trim().length > 0) {
        result[row.key as SettingKey] = row.value;
      }
    }
  } catch (error) {
    console.error("[nova] appearance read failed, using defaults", error);
    invalidateTableCheck();
  }
  return result;
}

async function upsertEntries(entries: [SettingKey, string][]) {
  for (const [key, value] of entries) {
    await db
      .insert(siteSettings)
      .values({ key, value: value.trim() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: value.trim(), updatedAt: new Date() },
      });
  }
}

/** Upserts the provided keys in one pass. */
export async function saveAppearance(values: Partial<Record<SettingKey, string>>) {
  const entries = Object.entries(values).filter(
    ([key]) => key in SETTING_DEFAULTS,
  ) as [SettingKey, string][];

  if (entries.length === 0) return;

  /* Creates the table first so a save never fails with "relation does not
     exist" on a fresh or reset database. If the write still fails, forget the
     table check, re-create the table, and try once more. */
  await ensureSettingsTable();
  try {
    await upsertEntries(entries);
  } catch (error) {
    console.error("[nova] appearance save failed, re-creating table and retrying", error);
    invalidateTableCheck();
    await ensureSettingsTable();
    await upsertEntries(entries);
  }
}

/** Removes the saved rows so the defaults take over again. */
export async function resetAppearance() {
  await ensureSettingsTable();
  try {
    await db.delete(siteSettings);
  } catch (error) {
    console.error("[nova] appearance reset failed, re-creating table and retrying", error);
    invalidateTableCheck();
    await ensureSettingsTable();
    await db.delete(siteSettings);
  }
}
