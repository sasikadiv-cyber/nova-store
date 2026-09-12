import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/auth";
import {
  getAppearance,
  resetAppearance,
  saveAppearance,
} from "@/lib/site-settings";
import {
  SETTING_DEFINITIONS,
  SETTING_DEFAULTS,
  type SettingKey,
} from "@/lib/appearance-schema";

export const dynamic = "force-dynamic";

/** Saves the storefront appearance (hero media and copy) in one request. */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Shop owner access only." }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
    }
  }

  let payload: { reset?: boolean; values?: Record<string, string> };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    if (payload.reset) {
      await resetAppearance();
    } else {
      const values = payload.values ?? {};
      const clean: Partial<Record<SettingKey, string>> = {};

      for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
        if (typeof values[key] === "string") {
          const value = values[key].trim();
          if (value.length === 0) continue;

          const definition = SETTING_DEFINITIONS.find((d) => d.key === key);
          const isLink = definition?.kind === "href";
          const isMedia = definition?.kind === "image" || definition?.kind === "video";

          /* Links and media must be internal or absolute https; toggles are
             boolean strings; plain copy may be free text. */
          if (isLink || isMedia) {
            clean[key] = /^https?:\/\//i.test(value) || value.startsWith("/") ? value : SETTING_DEFAULTS[key];
          } else if (definition?.kind === "toggle") {
            clean[key] = value === "true" ? "true" : "false";
          } else {
            clean[key] = value;
          }
        }
      }

      await saveAppearance(clean);
    }

    revalidatePath("/", "layout");
    const values = await getAppearance();
    return NextResponse.json({ ok: true, values });
  } catch (error) {
    console.error("[nova] appearance save failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not save the appearance." },
      { status: 500 },
    );
  }
}
