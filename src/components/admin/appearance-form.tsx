"use client";

import { useState } from "react";

import {
  GROUP_LABELS,
  SETTING_DEFINITIONS,
  type SettingDefinition,
  type SettingGroup,
  type SettingKey,
} from "@/lib/appearance-schema";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

/**
 * Site appearance editor.
 *
 * Hero and editorial media plus the hero wording, with a live preview for
 * every image and video. Saving writes all fields in a single request, so
 * there is one database round-trip no matter how many values changed.
 */
export function AppearanceForm({ initial }: { initial: Record<SettingKey, string> }) {
  const [values, setValues] = useState<Record<SettingKey, string>>(initial);
  const [pending, setPending] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const set = (key: SettingKey, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const isDefault = SETTING_DEFINITIONS.every(
    (definition) => values[definition.key] === definition.default,
  );

  async function save(mode: "save" | "reset") {
    setPending(mode);
    setError(null);
    try {
      const response = await fetch("/api/admin/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "reset" ? { reset: true } : { values }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; values?: Record<SettingKey, string> }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not save the appearance.");
      }

      if (payload.values) setValues(payload.values);
      setSavedAt(Date.now());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the appearance.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      {/* --------------------------------------------------- grouped fields */}
      {(Object.keys(GROUP_LABELS) as SettingGroup[]).map((group) => {
        const fields = SETTING_DEFINITIONS.filter((d) => d.group === group);
        const isMedia = group === "hero";

        return (
          <section key={group} className="mt-6 border border-sand bg-linen p-6">
            <h2 className="text-2xl">{GROUP_LABELS[group]}</h2>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-300">
              {group === "hero" &&
                "Hero film and copy, plus the story video and editorial still. Paste any https link, or a file placed in public/."}
              {group === "nav" && "The links in the navigation bar and the mobile menu."}
              {group === "announcement" && "The strip above the navigation bar. Turn it off entirely when you have nothing to announce."}
              {group === "promo" && "A seasonal discount card shown on the home page, with its own image and code chip."}
              {group === "home" && "The wording of each home page section."}
              {group === "popup" && "A premium card that appears shortly after someone opens the site. It shows once per visit until dismissed."}
            </p>

            <div className={isMedia ? "mt-6 grid gap-6 lg:grid-cols-2" : "mt-6 grid gap-5 lg:grid-cols-2"}>
              {fields.map((definition) => (
                <AppearanceField
                  key={definition.key}
                  definition={definition}
                  value={values[definition.key]}
                  onChange={(value) => set(definition.key, value)}
                  posterFor={
                    definition.key === "hero_video"
                      ? values.hero_poster
                      : values.atelier_poster
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* -------------------------------------------------------- actions */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-sand bg-linen p-5">
        <p className="text-[13px]">
          {savedAt ? (
            <span className="text-brass">
              ✓ Saved {new Date(savedAt).toLocaleTimeString("en-GB")} — live on the home page
            </span>
          ) : isDefault ? (
            <span className="text-ink-300">Using the built-in defaults.</span>
          ) : (
            <span className="text-ink-500">Custom appearance — unsaved changes are kept above.</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => save("reset")}
            disabled={pending !== null}
            className="border border-ink/15 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone disabled:opacity-50"
          >
            {pending === "reset" ? "Resetting" : "Reset all to defaults"}
          </button>
          <button
            type="button"
            onClick={() => save("save")}
            disabled={pending !== null}
            aria-busy={pending === "save"}
            className={`inline-flex items-center gap-2 bg-ink px-8 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700 disabled:opacity-60`}
          >
            {pending === "save" && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {pending === "save" ? "Saving" : "Save appearance"}
          </button>
        </div>
      </section>

      {error && (
        <p className="mt-4 border-l-2 border-ember bg-linen px-4 py-3 text-[13px] text-ember">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ one field */

function AppearanceField({
  definition,
  value,
  onChange,
  posterFor,
}: {
  definition: SettingDefinition;
  value: string;
  onChange: (value: string) => void;
  posterFor?: string;
}) {
  const isMedia = definition.kind === "video" || definition.kind === "image";

  if (definition.kind === "toggle") {
    const on = value === "true";
    return (
      <div className="border border-sand bg-bone p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13.5px]">{definition.label}</p>
            {definition.help && (
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-300">{definition.help}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(on ? "false" : "true")}
            aria-pressed={on}
            className={`relative h-7 w-14 shrink-0 border transition-colors ${
              on ? "border-ink bg-ink" : "border-ink/25 bg-bone"
            }`}
          >
            <span
              className={`absolute top-[3px] h-[18px] w-[18px] transition-all duration-300 ${
                on ? "left-[33px] bg-bone" : "left-[3px] bg-ink/40"
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-ink-300">
          {on ? "Shown on the site" : "Hidden"}
        </p>
      </div>
    );
  }

  return (
    <div className={isMedia ? "border border-sand bg-bone p-4" : ""}>
      <label className="block">
        <span className={label}>{definition.label}</span>
        {definition.kind === "multiline" ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            placeholder={definition.default}
            className={field}
          />
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={definition.default}
            className={
              definition.kind === "href" || definition.kind === "image" || definition.kind === "video"
                ? `${field} font-mono text-[12px]`
                : field
            }
          />
        )}
      </label>
      {definition.help && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-300">{definition.help}</p>
      )}

      {isMedia && (
        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-[104px] w-[150px] shrink-0 overflow-hidden bg-ink">
            {definition.kind === "video" ? (
              value.trim() ? (
                <video
                  key={value}
                  src={value}
                  poster={posterFor}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.14em] text-bone/40">
                  No video
                </span>
              )
            ) : value.trim() ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.14em] text-bone/40">
                No image
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-ink-300">Preview</p>
            <p className="mt-1.5 break-all font-mono text-[11px] text-ink-500">
              {value.trim() || "—"}
            </p>
            {value !== definition.default && (
              <button
                type="button"
                onClick={() => onChange(definition.default)}
                className="link-underline mt-2 text-[11px] uppercase tracking-[0.14em] text-brass"
              >
                Reset this field
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
