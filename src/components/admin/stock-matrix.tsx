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
 * Stock matrix where every card is read-only until the owner picks up the
 * pencil. A slip of the cursor can never change a count, and each card is
 * saved on its own — so editing one product never touches another.
 */
export function StockMatrix({ products }: { products: MatrixProduct[] }) {
  const router = useRouter();

  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: number; at: number } | null>(null);

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

  function countFor(productId: number) {
    return changes.filter((row) => row.productId === productId).length;
  }

  function beginEdit(productId: number) {
    setError(null);
    setEditing((current) => ({ ...current, [productId]: true }));
  }

  function cancelEdit(productId: number) {
    setDrafts((current) => {
      const copy = { ...current };
      for (const key of Object.keys(copy)) {
        if (key.startsWith(`${productId}||`)) delete copy[key];
      }
      return copy;
    });
    setEditing((current) => ({ ...current, [productId]: false }));
  }

  /** Saves one card's pending changes, and only those. */
  async function saveProduct(productId: number) {
    const updates = changes.filter((row) => row.productId === productId);
    if (pendingId !== null || updates.length === 0) {
      setEditing((current) => ({ ...current, [productId]: false }));
      return;
    }

    setPendingId(productId);
    setError(null);

    try {
      const response = await fetch("/api/admin/stock/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; updated?: number }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not update the stock.");
      }

      setDrafts((current) => {
        const copy = { ...current };
        for (const key of Object.keys(copy)) {
          if (key.startsWith(`${productId}||`)) delete copy[key];
        }
        return copy;
      });
      setEditing((current) => ({ ...current, [productId]: false }));
      setSaved({ id: productId, at: Date.now() });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the stock.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-5 border-l-2 border-ember bg-linen px-4 py-3 text-[13px] text-ember">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {products.map((product) => {
          const colours = [...new Set(product.variants.map((v) => v.color))];
          const sizes = [...new Set(product.variants.map((v) => v.size))];
          const isEditing = editing[product.id] === true;
          const pending = pendingId === product.id;
          const pendingCount = countFor(product.id);
          const liveTotal = product.variants.reduce(
            (total, row) => total + valueOf(`${product.id}||${row.color}||${row.size}`, row.stock),
            0,
          );
          const justSaved = saved?.id === product.id;

          return (
            <section
              key={product.id}
              className={`border bg-linen transition-colors ${
                isEditing ? "border-ink/35" : "border-sand"
              }`}
            >
              {/* ------------------------------------------------ card head */}
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
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  </Link>

                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-[15px] underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-[12px] text-ink-300">
                      {product.category} · {colours.length} colours × {sizes.length} sizes ·{" "}
                      <span className={liveTotal === 0 ? "text-ember" : "text-ink-500"}>
                        {liveTotal} on hand
                      </span>
                    </p>
                    {justSaved && !isEditing && (
                      <p className="mt-1 text-[11.5px] text-ok">
                        ✓ Saved {new Date(saved.at).toLocaleTimeString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
                  >
                    View
                  </Link>

                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => cancelEdit(product.id)}
                        disabled={pending}
                        className="border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] text-ink-300 transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveProduct(product.id)}
                        disabled={pending}
                        aria-busy={pending}
                        className={`inline-flex items-center gap-2 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-bone transition-colors ${
                          pending ? "cursor-wait bg-ink/50" : "bg-ink hover:bg-ink-700"
                        }`}
                      >
                        {pending && (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                        )}
                        {pending
                          ? "Saving"
                          : pendingCount > 0
                            ? `Save ${pendingCount} change${pendingCount === 1 ? "" : "s"}`
                            : "Done"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEdit(product.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                        pendingCount > 0
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
                      {pendingCount > 0 ? `Edit (${pendingCount} unsaved)` : "Edit stocks"}
                    </button>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------- matrix */}
              <div className="hide-scrollbar overflow-x-auto p-5">
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
                    {colours.map((color) => {
                      const rowTotal = sizes.reduce((total, size) => {
                        const row = product.variants.find(
                          (entry) => entry.color === color && entry.size === size,
                        );
                        const key = `${product.id}||${color}||${size}`;
                        return total + (row ? valueOf(key, row.stock) : 0);
                      }, 0);

                      return (
                        <tr key={color} className="border-b border-sand/70 last:border-b-0">
                          <td className="py-2.5 pr-4">
                            <span className="flex items-center gap-2.5">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-ink/15"
                                style={{
                                  backgroundColor:
                                    product.colors.find((entry) => entry.name === color)?.hex ||
                                    "#c9c2b6",
                                }}
                              />
                              <span className="whitespace-nowrap text-ink-500">{color}</span>
                            </span>
                          </td>

                          {sizes.map((size) => {
                            const row = product.variants.find(
                              (entry) => entry.color === color && entry.size === size,
                            );
                            const key = `${product.id}||${color}||${size}`;
                            const fallback = row?.stock ?? 0;
                            const value = valueOf(key, fallback);
                            const edited = key in drafts;

                            if (!isEditing) {
                              /* Read-only until the owner picks up the pencil. */
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
                                  onChange={(event) => setCell(key, fallback, event.target.value)}
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
      </div>
    </div>
  );
}
