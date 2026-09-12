"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Cell = { color: string; size: string; stock: number };

/**
 * A copy of the stock management card, inside the product form.
 *
 * Same head — image, name, colour × size counts and the total on hand — and
 * the same matrix underneath, read-only until the owner picks up the pencil.
 * Counts travel with the form as one JSON field, so the piece is saved with
 * its stock already correct.
 */
export function VariantStockEditor({
  formRef,
  productName,
  productCategory,
  productImage,
  productSlug,
  initialColors,
  initialSizes,
  initialStocks,
  productColors = [],
  startInEdit,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  productName?: string;
  productCategory?: string;
  productImage?: string;
  productSlug?: string;
  initialColors: string[];
  initialSizes: string[];
  initialStocks?: Cell[];
  productColors?: { name: string; hex: string }[];
  startInEdit?: boolean;
}) {
  const initial = useMemo(() => {
    const seed: Record<string, number> = {};
    for (const cell of initialStocks ?? []) seed[`${cell.color}|${cell.size}`] = cell.stock;
    return seed;
  }, [initialStocks]);

  const [colors, setColors] = useState(
    initialColors.length > 0 ? initialColors : ["Optic White"],
  );
  const [sizes, setSizes] = useState(initialSizes.length > 0 ? initialSizes : ["S", "M", "L"]);
  const [stocks, setStocks] = useState<Record<string, number>>(initial);
  const [colourHexes, setColourHexes] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const entry of productColors) seed[entry.name] = entry.hex;
    return seed;
  });
  const [editing, setEditing] = useState(startInEdit ?? (initialStocks ?? []).length === 0);

  function sync() {
    const form = formRef.current;
    if (!form) return;

    const colorField =
      (form.elements.namedItem("colors") as HTMLInputElement | null)?.value ?? "";
    const sizeField =
      (form.elements.namedItem("sizes") as HTMLInputElement | null)?.value ?? "";

    /* Colours are serialised as "name | hex | family" lines. */
    const names: string[] = [];
    const hexes: Record<string, string> = {};
    for (const line of colorField.split("\n")) {
      const [name, hex] = line.split("|").map((part) => part.trim());
      if (!name) continue;
      names.push(name);
      if (hex) hexes[name] = hex;
    }

    const nextColors = names.length > 0 ? names : ["Optic White"];
    const nextSizes = sizeField
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const finalSizes = nextSizes.length > 0 ? nextSizes : ["S", "M", "L"];

    setColors((current) =>
      current.length === nextColors.length && current.every((c, i) => c === nextColors[i])
        ? current
        : nextColors,
    );
    setSizes((current) =>
      current.length === finalSizes.length && current.every((s, i) => s === finalSizes[i])
        ? current
        : finalSizes,
    );
    setColourHexes((current) => {
      const keys = Object.keys(current);
      if (keys.length === Object.keys(hexes).length && keys.every((k) => current[k] === hexes[k])) {
        return current;
      }
      return hexes;
    });
  }

  /* Kept in step with the colour and size pickers while the form is open, so
     the matrix never drifts from what the form will submit. */
  useEffect(() => {
    sync();
    const timer = window.setInterval(sync, 700);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valueOf = (key: string) => stocks[key] ?? 0;
  const total = colors.reduce(
    (sum, color) => sum + sizes.reduce((inner, size) => inner + valueOf(`${color}|${size}`), 0),
    0,
  );
  const editedCount = colors.reduce(
    (sum, color) =>
      sum +
      sizes.filter((size) => valueOf(`${color}|${size}`) !== (initial[`${color}|${size}`] ?? 0))
        .length,
    0,
  );

  const cells: Cell[] = colors.flatMap((color) =>
    sizes.map((size) => ({ color, size, stock: valueOf(`${color}|${size}`) })),
  );

  return (
    <section className={`border bg-linen transition-colors ${editing ? "border-ink/35" : "border-sand"}`}>
      <input type="hidden" name="variantStocks" value={JSON.stringify(cells)} />

      {/* ------------------------------------------------------- card head */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand p-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative h-[76px] w-[58px] shrink-0 overflow-hidden bg-bone-dark">
            {total === 0 && (
              <span className="absolute inset-x-0 bottom-0 z-10 bg-ember px-1 py-0.5 text-center text-[8.5px] uppercase tracking-[0.1em] text-bone">
                No stock
              </span>
            )}
            {productImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={productImage}
                alt={productName ?? "New piece"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-[9.5px] uppercase tracking-[0.1em] text-ink-300">
                New
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[15px]">{productName ?? "New piece"}</p>
            <p className="mt-1 text-[12px] text-ink-300">
              {productCategory ?? "Uncategorised"} · {colors.length} colour
              {colors.length === 1 ? "" : "s"} × {sizes.length} size
              {sizes.length === 1 ? "" : "s"} ·{" "}
              <span className={total === 0 ? "text-ember" : "text-ink-500"}>
                {total} on hand
              </span>
            </p>
            {editedCount > 0 && (
              <p className="mt-1 text-[11.5px] text-brass">
                {editedCount} unsaved change{editedCount === 1 ? "" : "s"} — saved with the piece
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {productSlug && (
            <Link
              href={`/products/${productSlug}`}
              className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
            >
              View
            </Link>
          )}

          <button
            type="button"
            onClick={sync}
            className="inline-flex items-center gap-2 border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] text-ink-300 transition-colors hover:border-ink hover:text-ink"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
            </svg>
            Sync colours &amp; sizes
          </button>

          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="bg-ink px-5 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-bone transition-colors hover:bg-ink-700"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                editedCount > 0
                  ? "bg-brass text-ink hover:bg-brass/85"
                  : "border border-ink/20 hover:border-ink"
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
              </svg>
              {editedCount > 0 ? `Edit (${editedCount} unsaved)` : "Edit stocks"}
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- matrix */}
      <div className="stock-scroll max-w-[560px] overflow-x-auto p-5">
        <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-sand text-left">
              <th className="eyebrow pb-2.5 pr-4 text-ink-300">Colour</th>
              {sizes.map((size) => (
                <th key={size} className="px-1 pb-2.5 text-center text-[11px] text-ink-500">
                  {size}
                </th>
              ))}
              <th className="pb-2.5 pl-3 text-right text-[11px] text-ink-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => {
              const rowTotal = sizes.reduce(
                (inner, size) => inner + valueOf(`${color}|${size}`),
                0,
              );
              const hex = colourHexes[color] || productColors.find((entry) => entry.name === color)?.hex || "#c9c2b6";

              return (
                <tr key={color} className="border-b border-sand/70 last:border-b-0">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-ink/15"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="whitespace-nowrap text-ink-500">{color}</span>
                    </span>
                  </td>

                  {sizes.map((size) => {
                    const key = `${color}|${size}`;
                    const value = valueOf(key);
                    const edited = value !== (initial[key] ?? 0);

                    if (!editing) {
                      return (
                        <td key={size} className="px-1 py-2.5 text-center">
                          <span
                            className={`inline-block min-w-[44px] px-2 py-1.5 text-center tabular-nums ${
                              value === 0
                                ? "bg-ember/8 text-ember"
                                : value <= 5
                                  ? "bg-brass/12 text-ink"
                                  : "text-ink-500"
                            }`}
                          >
                            {value}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td key={size} className="px-1 py-2.5">
                        <input
                          type="number"
                          min={0}
                          value={value}
                          onChange={(event) => {
                            const parsed = Math.max(0, Math.round(Number(event.target.value)));
                            if (!Number.isFinite(parsed)) return;
                            setStocks((current) => ({ ...current, [key]: parsed }));
                          }}
                          aria-label={`${color} ${size} stock`}
                          className={`w-[68px] border px-2 py-1.5 text-center text-[12.5px] tabular-nums outline-none transition-colors focus:border-ink ${
                            edited
                              ? "border-brass bg-brass/15"
                              : value === 0
                                ? "border-ember/40 bg-ember/5"
                                : value <= 5
                                  ? "border-brass/50 bg-brass/10"
                                  : "border-ink/15 bg-bone"
                          }`}
                        />
                      </td>
                    );
                  })}

                  <td className="py-2.5 pl-3 text-right tabular-nums text-ink-500">{rowTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-sand px-5 py-3 text-[12px] leading-relaxed text-ink-300">
        Counts are written per colour and size when the piece is saved — the same matrix you will
        find under Stock management.
      </p>
    </section>
  );
}
