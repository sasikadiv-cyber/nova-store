import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { SETTING_DEFAULTS, type SettingKey, type SiteAppearance } from "./appearance-schema";

export * from "./appearance-schema";

/** Reads every setting, falling back to the defaults for anything missing. */
export async function getAppearance(): Promise<SiteAppearance> {
  const result: SiteAppearance = { ...SETTING_DEFAULTS };
  try {
    const rows = await db.select().from(siteSettings);
    for (const row of rows) {
      if (row.key in SETTING_DEFAULTS && row.value.trim().length > 0) {
        result[row.key as SettingKey] = row.value;
      }
    }
  } catch (error) {
    console.error("[nova] appearance read failed, using defaults", error);
  }
  return result;
}

/** Upserts the provided keys in one pass. */
export async function saveAppearance(values: Partial<Record<SettingKey, string>>) {
  const entries = Object.entries(values).filter(
    ([key]) => key in SETTING_DEFAULTS,
  ) as [SettingKey, string][];

  if (entries.length === 0) return;

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

/** Removes the saved rows so the defaults take over again. */
export async function resetAppearance() {
  await db.delete(siteSettings);
}
