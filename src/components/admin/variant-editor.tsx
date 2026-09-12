"use client";

import { useState } from "react";

/* -------------------------------------------------------------- colour wheel */

type Colour = { name: string; hex: string; family: string };

const FAMILIES = ["White", "Black", "Grey", "Blue", "Green", "Red", "Pink", "Neutral"];

/** One-click swatches so the common Nova colourways need no typing at all. */
const PRESETS: Colour[] = [
  { name: "Optic White", hex: "#f8f6f2", family: "White" },
  { name: "Ivory", hex: "#eae3d6", family: "White" },
  { name: "Black", hex: "#121212", family: "Black" },
  { name: "Charcoal", hex: "#38393c", family: "Black" },
  { name: "Graphite", hex: "#6b6d72", family: "Grey" },
  { name: "Navy", hex: "#222d42", family: "Blue" },
];

/** Derive a sensible name/family from a picked hex so a single click is enough. */
function classify(hex: string): { name: string; family: string } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max - min < 18) {
    if (lightness > 225) return { name: "Optic White", family: "White" };
    if (lightness > 170) return { name: "Ivory", family: "White" };
    if (lightness < 45) return { name: "Black", family: "Black" };
    if (lightness < 95) return { name: "Charcoal", family: "Black" };
    return { name: "Graphite", family: "Grey" };
  }
  if (b > r && b > g) return { name: "Navy", family: "Blue" };
  if (g > r && g > b) return { name: "Moss", family: "Green" };
  if (r > g && r > b) return lightness > 170 ? { name: "Rose", family: "Pink" } : { name: "Bordeaux", family: "Red" };
  return { name: "Neutral", family: "Neutral" };
}

export function ColourEditor({ initial }: { initial: string }) {
  const seed = initial
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, hex, family] = line.split("|").map((part) => (part ?? "").trim());
      return { name: name || "Colour", hex: hex || "#cccccc", family: family || "Neutral" };
    });

  const [colours, setColours] = useState<Colour[]>(
    seed.length
      ? seed
      : [
          { name: "Optic White", hex: "#f8f6f2", family: "White" },
          { name: "Black", hex: "#121212", family: "Black" },
        ],
  );

  const serialised = colours.map((c) => `${c.name} | ${c.hex} | ${c.family}`).join("\n");

  const update = (index: number, patch: Partial<Colour>) =>
    setColours((current) =>
      current.map((colour, i) => (i === index ? { ...colour, ...patch } : colour)),
    );

  return (
    <div>
      <input type="hidden" name="colors" value={serialised} />

      {/* quick presets */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 text-ink-300">Quick add</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() =>
              setColours((current) =>
                current.some((c) => c.name === preset.name)
                  ? current
                  : [...current, { ...preset }],
              )
            }
            title={`Add ${preset.name}`}
            className="flex items-center gap-2 border border-ink/15 px-2.5 py-1.5 text-[11.5px] transition-colors hover:border-ink hover:bg-bone"
          >
            <span
              className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/15"
              style={{ backgroundColor: preset.hex }}
            />
            {preset.name}
          </button>
        ))}
      </div>

      {/* picker row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 border border-ink/15 bg-bone px-3 py-2">
          <input
            type="color"
            defaultValue="#f8f6f2"
            onChange={(event) => {
              const hex = event.target.value;
              const guess = classify(hex);
              setColours((current) =>
                current.some((c) => c.hex === hex)
                  ? current
                  : [...current, { name: guess.name, hex, family: guess.family }],
              );
            }}
            className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
            aria-label="Pick a colour"
          />
          <span className="text-[11.5px] text-ink-300">Pick from the wheel</span>
        </label>
        <span className="text-[11.5px] text-ink-300">{colours.length} colourways</span>
      </div>

      {/* editable list — one colour per row, stacked one under another */}
      <ul className="mt-3 space-y-2">
        {colours.map((colour, index) => (
          <li
            key={`${colour.name}-${index}`}
            className="grid gap-2 border border-sand bg-bone p-3 sm:grid-cols-[auto_auto_1fr_auto_auto] sm:items-center"
          >
            <input
              type="color"
              value={colour.hex}
              onChange={(event) => update(index, { hex: event.target.value })}
              aria-label={`${colour.name} swatch`}
              className="h-10 w-12 shrink-0 cursor-pointer border border-ink/15 bg-linen p-1"
            />

            <input
              value={colour.hex}
              onChange={(event) => update(index, { hex: event.target.value })}
              aria-label={`${colour.name} hex code`}
              spellCheck={false}
              className="w-[86px] border border-ink/15 bg-linen px-2 py-2 font-mono text-[12.5px] tracking-[0.04em] outline-none focus:border-ink"
            />

            <input
              value={colour.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="Colour name"
              className="w-full border border-ink/15 bg-linen px-3 py-2 text-[13px] outline-none focus:border-ink"
            />

            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <select
                value={FAMILIES.includes(colour.family) ? colour.family : "__custom"}
                onChange={(event) =>
                  update(index, {
                    family: event.target.value === "__custom" ? "" : event.target.value,
                  })
                }
                className="border border-ink/15 bg-linen px-2 py-2 text-[12.5px] outline-none focus:border-ink"
                aria-label="Colour family"
              >
                {FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
                <option value="__custom">
                  {FAMILIES.includes(colour.family) ? "Custom…" : "Custom…"}
                </option>
              </select>

              {!FAMILIES.includes(colour.family) && (
                <input
                  value={colour.family}
                  onChange={(event) => update(index, { family: event.target.value })}
                  placeholder="Custom family"
                  className="w-full border border-brass/60 bg-brass/10 px-2 py-2 text-[12.5px] outline-none focus:border-ink sm:w-[130px]"
                  aria-label="Custom colour family"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setColours((current) => current.filter((_, i) => i !== index))}
              aria-label={`Remove ${colour.name}`}
              className="grid h-9 w-9 shrink-0 place-items-center border border-ink/15 text-ink-300 transition-colors hover:border-ember hover:text-ember"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setColours((current) => [...current, { name: "New colour", hex: "#cccccc", family: "Neutral" }])
        }
        className="mt-3 border border-ink/15 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors hover:bg-ink hover:text-bone"
      >
        + Add colour
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- sizes */

const SIZE_PRESETS: Record<string, string[]> = {
  alpha: ["XS", "S", "M", "L", "XL", "XXL"],
  shoe: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  one: ["One Size"],
};

export function SizeEditor({ initial, initialType }: { initial: string; initialType: string }) {
  const [sizeType, setSizeType] = useState(initialType || "alpha");
  const [custom, setCustom] = useState("");

  const seed = initial
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const [sizes, setSizes] = useState<string[]>(seed.length ? seed : ["S", "M", "L"]);

  const presets = SIZE_PRESETS[sizeType] ?? SIZE_PRESETS.alpha;

  const toggle = (value: string) =>
    setSizes((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
    );

  return (
    <div>
      <input type="hidden" name="sizes" value={sizes.join(", ")} />
      <input type="hidden" name="sizeType" value={sizeType} />

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => {
          const on = sizes.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggle(preset)}
              className={`min-w-[52px] border py-2 text-[12.5px] transition-colors ${
                on ? "border-ink bg-ink text-bone" : "border-ink/15 text-ink-300 hover:border-ink/50"
              }`}
            >
              {preset}
            </button>
          );
        })}

        {/* Sizes the owner typed in are shown as chips too, so an addition is
           always visible — not only in the summary line. */}
        {sizes
          .filter((size) => !presets.includes(size))
          .map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggle(size)}
              title={`Remove ${size}`}
              className="inline-flex items-center gap-1.5 border border-brass bg-brass/15 px-3 py-2 text-[12.5px] text-ink transition-colors hover:border-ember hover:bg-ember/10"
            >
              {size}
              <span aria-hidden="true" className="text-[11px] text-ink-300">
                ×
              </span>
            </button>
          ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Custom size (e.g. 29 waist)"
          className="min-w-[160px] flex-1 border border-ink/15 bg-bone px-3 py-2 text-[13px] outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() => {
            const value = custom.trim();
            if (value && !sizes.includes(value)) setSizes((current) => [...current, value]);
            setCustom("");
          }}
          className="border border-ink/15 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors hover:bg-ink hover:text-bone"
        >
          + Add
        </button>
        {sizes.length > 0 && (
          <button
            type="button"
            onClick={() => setSizes([])}
            className="link-underline text-[11.5px] uppercase tracking-[0.14em] text-ink-300"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="mt-3 text-[12px] text-ink-300">
        {sizes.length} sizes selected: {sizes.join(" · ") || "none yet"}
      </p>
    </div>
  );
}
