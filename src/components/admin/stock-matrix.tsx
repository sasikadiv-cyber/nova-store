"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { Product } from "@/db/schema";
import type { VariantStockView } from "@/lib/variants";

type MatrixProduct = {
  id: number;
  slug: string;
  name: string;
  category: string;
  image: string;
  stock: number;
  colors: { name: string; hex: string }[];
  variants: VariantStockView[];
};

/**
 * Stock matrix that only writes when the owner presses Update.
 *
 * Edits are held in local state, so changing twenty cells costs nothing until
 * the single batch request is sent — which keeps the write volume predictable
 * instead of hitting the database on every keystroke.
 */
export function StockMatrix({ products }: { products: MatrixProduct[] }) {
  const router = useRouter();

  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const changes = useMemo(
    () =>
      Object.entries(drafts)
        .map(([key, stock]) => {
          const [productId, color, size] = key.split("||");
          return { productId: Number(productId), color, size, stock };
        })
        .filter((row) => Number.isFinite(row.productId)),
    [drafts],
  );

  const dirtyCount = changes.length;

  function setCell(key: string, fallback: number, next: string) {
    const parsed = Math.max(0, Math.round(Number(next)));
    if (!Number.isFinite(parsed)) return;
    setDrafts((current) => {
      const copy = { ...current };
      if (parsed === fallback) delete copy[key];
      else copy[key] = parsed;
      return copy;
    });
  }

  function valueOf(key: string, fallback: number) {
    return key in drafts ? drafts[key] : fallback;
  }

  async function saveAll() {
    if (pending || dirtyCount === 0) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/stock/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: changes }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; updated?: number }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not save those stock levels.");
      }

      setDrafts({});
      setSavedAt(Date.now());
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save those stock levels.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {/* -------------------------------------------------- update bar */}
      <div className="sticky top-[84px] z-20 mb-5 flex flex-wrap items-center justify-between gap-3 border border-sand bg-bone/95 px-4 py-3 backdrop-blur">
        <p className="text-[13px]">
          {dirtyCount === 0 ? (
            savedAt ? (
              <span className="text-brass">
                ✓ Stock updated {new Date(savedAt).toLocaleTimeString("en-GB")}
              </span>
            ) : (
              <span className="text-ink-300">
                Change the counts below, then press Update — nothing is written until you do.
              </span>
            )
          ) : (
            <span className="text-ink">
              {dirtyCount} change{dirtyCount === 1 ? "" : "s"} pending
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <button
              type="button"
              onClick={() => setDrafts({})}
              className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={saveAll}
            disabled={pending || dirtyCount === 0}
            aria-busy={pending}
            className={`inline-flex items-center gap-2 px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors ${
              pending || dirtyCount === 0
                ? "cursor-not-allowed bg-ink/35"
                : "bg-ink hover:bg-ink-700"
            }`}
          >
            {pending && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {pending ? "Updating all stock" : `Update all stock${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-5 border-l-2 border-ember bg-linen px-4 py-3 text-[13px] text-ember">
          {error}
        </p>
      )}

      {/* -------------------------------------------------- the matrix */}
      <div className="space-y-5">
        {products.map((product) => {
          const colours = [...new Set(product.variants.map((v) => v.color))];
          const sizes = [...new Set(product.variants.map((v) => v.size))];
          const liveTotal = product.variants.reduce(
            (total, row) => total + valueOf(`${product.id}||${row.color}||${row.size}`, row.stock),
            0,
          );

          return (
            <section key={product.id} className="border border-sand bg-linen">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand p-5">
                <div className="flex min-w-0 items-start gap-4">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="relative h-[76px] w-[58px] shrink-0 overflow-hidden bg-bone-dark"
                  >
                    {product.stock === 0 && (
                      <span className="absolute inset-x-0 bottom-0 z-10 bg-ember px-1 py-0.5 text-center text-[8.5px] uppercase tracking-[0.1em] text-bone">
                        Sold out
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="link-underline text-[16px]"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-[12px] text-ink-300">
                      {product.category} · {colours.length} colours × {sizes.length} sizes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="eyebrow text-ink-300">Total on hand</p>
                    <p
                      className={`font-display text-3xl leading-none tabular-nums ${
                        liveTotal === 0 ? "text-ember" : liveTotal <= 20 ? "text-brass" : ""
                      }`}
                    >
                      {liveTotal}
                    </p>
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="link-underline text-[11px] uppercase tracking-[0.14em] text-ink-300"
                  >
                    View live
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[560px] text-left text-[12.5px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.14em] text-ink-300">
                      <th className="pb-3 pr-4 font-medium">Colour</th>
                      {sizes.map((size) => (
                        <th key={size} className="px-1 pb-3 text-center font-medium">
                          {size}
                        </th>
                      ))}
                      <th className="pb-3 pl-3 text-right font-medium">Row</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colours.map((color) => {
                      const rowTotal = sizes.reduce(
                        (total, size) =>
                          total +
                          valueOf(
                            `${product.id}||${color}||${size}`,
                            product.variants.find((v) => v.color === color && v.size === size)
                              ?.stock ?? 0,
                          ),
                        0,
                      );

                      return (
                        <tr key={color} className="border-t border-sand/70">
                          <td className="py-2.5 pr-4">
                            <span className="flex items-center gap-2.5">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-ink/20"
                                style={{
                                  backgroundColor:
                                    product.colors.find((c) => c.name === color)?.hex ?? "#ccc",
                                }}
                              />
                              {color}
                            </span>
                          </td>
                          {sizes.map((size) => {
                            const key = `${product.id}||${color}||${size}`;
                            const fallback =
                              product.variants.find((v) => v.color === color && v.size === size)
                                ?.stock ?? 0;
                            const value = valueOf(key, fallback);
                            const edited = key in drafts;

                            return (
                              <td key={size} className="px-1 py-2.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={value}
                                  onChange={(event) =>
                                    setCell(key, fallback, event.target.value)
                                  }
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
                          <td className="py-2.5 pl-3 text-right tabular-nums text-ink-500">
                            {rowTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {/* The same single commit action, repeated at the bottom so it is
            always within reach after a long matrix. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-5">
          <p className="text-[12.5px] text-ink-300">
            {dirtyCount === 0
              ? "All stock levels are saved."
              : `${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"} across ${
                  new Set(changes.map((row) => row.productId)).size
                } product${new Set(changes.map((row) => row.productId)).size === 1 ? "" : "s"}.`}
          </p>
          <button
            type="button"
            onClick={saveAll}
            disabled={pending || dirtyCount === 0}
            className={`inline-flex items-center gap-2 px-8 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors ${
              pending || dirtyCount === 0
                ? "cursor-not-allowed bg-ink/35"
                : "bg-ink hover:bg-ink-700"
            }`}
          >
            {pending && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {pending ? "Updating all stock" : "Update all stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
