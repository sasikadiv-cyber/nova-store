"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Facets } from "@/lib/queries";
import { buildQuery, countActive, SORT_LABELS, type FilterState } from "@/lib/filters";
import type { SortKey } from "@/lib/queries";
import { formatUsd } from "@/lib/currency";

type Props = {
  facets: Facets;
  state: FilterState;
};

const PRICE_PRESETS = [
  { label: "Under $200", min: null, max: 200 },
  { label: "$200 – $400", min: 200, max: 400 },
  { label: "$400 – $600", min: 400, max: 600 },
  { label: "$600+", min: 600, max: null },
];

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/20 ring-offset-2 ring-offset-bone"
      style={{ backgroundColor: hex }}
    />
  );
}

const FAMILY_HEX: Record<string, string> = {
  White: "#f2efe9",
  Black: "#1a1a1c",
  Grey: "#6b6d72",
  Blue: "#2c3d5f",
  Green: "#4a5343",
  Red: "#8f3a34",
  Pink: "#d9a2a4",
};

export function ShopControls({ facets, state }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<FilterState>(state);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => setDraft(state), [state]);

  const apply = (next: FilterState) => {
    setDraft(next);
    const query = buildQuery(next);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggle = (key: "categories" | "genders" | "sizes" | "families", value: string) => {
    const current = draft[key];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    apply({ ...draft, [key]: next });
  };

  const clearAll = () =>
    apply({
      categories: [],
      genders: [],
      sizes: [],
      families: [],
      collection: null,
      search: null,
      min: null,
      max: null,
      onSale: false,
      sort: draft.sort,
    });

  const activeCount = countActive(state);

  const Panel = (
    <div className="flex flex-col gap-9">
      <Group title="Category">
        {facets.categories.map((category) => (
          <Check
            key={category.name}
            label={category.name}
            count={category.count}
            checked={draft.categories.includes(category.name)}
            onChange={() => toggle("categories", category.name)}
          />
        ))}
      </Group>

      <Group title="Shop for">
        {facets.genders.map((gender) => (
          <Check
            key={gender.name}
            label={gender.name}
            count={gender.count}
            checked={draft.genders.includes(gender.name)}
            onChange={() => toggle("genders", gender.name)}
          />
        ))}
      </Group>

      <Group title="Size">
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((size) => {
            const active = draft.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggle("sizes", size)}
                className={`min-w-[44px] border px-2.5 py-2 text-[12px] tracking-[0.06em] transition-colors ${
                  active
                    ? "border-ink bg-ink text-bone"
                    : "border-ink/15 text-ink-500 hover:border-ink/45"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Colour">
        <div className="flex flex-col gap-2.5">
          {facets.families.map((family) => {
            const active = draft.families.includes(family.name);
            return (
              <button
                key={family.name}
                type="button"
                onClick={() => toggle("families", family.name)}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="flex items-center gap-3">
                  <Swatch hex={FAMILY_HEX[family.name] ?? "#c9c2b6"} />
                  <span className={active ? "text-ink" : "text-ink-500"}>{family.name}</span>
                </span>
                <span
                  className={`h-[14px] w-[14px] border transition-colors ${
                    active ? "border-ink bg-ink" : "border-ink/25"
                  }`}
                >
                  {active && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f8f5f0" strokeWidth="3">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Price">
        <div className="flex flex-col">
          {PRICE_PRESETS.map((preset) => {
            const active = draft.min === preset.min && draft.max === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  apply({
                    ...draft,
                    min: active ? null : preset.min,
                    max: active ? null : preset.max,
                  })
                }
                className={`flex items-center justify-between border-b border-ink/8 py-2 text-left text-[12.5px] transition-colors last:border-b-0 ${
                  active ? "text-ink" : "text-ink-500 hover:text-ink"
                }`}
              >
                {preset.label}
                <span
                  className={`h-[13px] w-[13px] shrink-0 border transition-colors ${
                    active ? "border-ink bg-ink" : "border-ink/25"
                  }`}
                >
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f7f4ef" strokeWidth="3">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-6 block">
          <span className="flex items-center justify-between text-[12px] text-ink-300">
            <span>Max price</span>
            <span className="text-ink">
              {formatUsd((draft.max ?? facets.priceMax) * 100)}
            </span>
          </span>
          <input
            type="range"
            min={facets.priceMin}
            max={facets.priceMax}
            step={10}
            value={draft.max ?? facets.priceMax}
            onChange={(event) => apply({ ...draft, max: Number(event.target.value) })}
            className="mt-3 w-full accent-ink"
          />
        </label>
      </Group>

      <Group title="Offers">
        <Check
          label="On sale only"
          checked={draft.onSale}
          onChange={() => apply({ ...draft, onSale: !draft.onSale })}
        />
      </Group>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start border-b border-ink pb-1 text-[11.5px] uppercase tracking-[0.16em]"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[188px] shrink-0 lg:block xl:w-[210px]">
        <div className="hide-scrollbar sticky top-[92px] flex max-h-[calc(100vh-120px)] flex-col overflow-y-auto">
          <div className="mb-6 flex items-baseline justify-between border-b border-ink/12 pb-4">
            <p className="eyebrow text-ink-300">Refine</p>
            {activeCount > 0 && <span className="text-[11.5px] text-ink-300">{activeCount} active</span>}
          </div>
          {Panel}
        </div>
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-center gap-2 border border-ink/20 px-4 py-2.5 text-[11.5px] uppercase tracking-[0.16em] lg:hidden"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
        Filters
        {activeCount > 0 && <span className="text-brass">({activeCount})</span>}
      </button>

      {/* Mobile sheet */}
      <div
        aria-hidden={!sheetOpen}
        className={`fixed inset-0 z-[125] lg:hidden ${sheetOpen ? "" : "pointer-events-none"}`}
      >
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-scrim/45 backdrop-blur-[2px] transition-opacity duration-400 ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[86vh] overflow-y-auto bg-bone px-6 pb-8 pt-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mb-7 flex items-center justify-between">
            <p className="font-display text-2xl">Refine</p>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close filters"
              className="grid h-10 w-10 place-items-center rounded-full border border-ink/15"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>
          {Panel}
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="mt-9 w-full bg-ink py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone"
          >
            Show results
          </button>
        </div>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-ink-300">{title}</p>
      {children}
    </div>
  );
}

function Check({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button type="button" onClick={onChange} className="group flex w-full items-center gap-3 py-1.5 text-left">
      <span
        className={`grid h-[15px] w-[15px] shrink-0 place-items-center border transition-colors ${
          checked ? "border-ink bg-ink" : "border-ink/25 group-hover:border-ink/60"
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f8f5f0" strokeWidth="3">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        )}
      </span>
      <span className={`flex-1 text-[13px] ${checked ? "text-ink" : "text-ink-500"}`}>{label}</span>
      {count != null && <span className="text-[11.5px] text-ink-300 tabular-nums">{count}</span>}
    </button>
  );
}

export function SortSelect({ state }: { state: FilterState }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-3 text-[11.5px] uppercase tracking-[0.14em] text-ink-300">
      <span className="hidden sm:inline">Sort</span>
      <select
        value={state.sort}
        onChange={(event) => {
          const query = buildQuery({ ...state, sort: event.target.value as SortKey });
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
        className="cursor-pointer appearance-none border-b border-ink/25 bg-transparent py-1 pr-1 text-[12px] tracking-[0.06em] text-ink outline-none"
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
