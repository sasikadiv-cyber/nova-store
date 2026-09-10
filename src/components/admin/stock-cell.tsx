"use client";

import { useState } from "react";

/**
 * One colour × size cell in the stock matrix. Saves on blur or Enter and
 * reports the running total back so the owner sees the product sum move.
 */
export function StockCell({
  productId,
  color,
  size,
  stock,
  onSaved,
}: {
  productId: number;
  color: string;
  size: string;
  stock: number;
  onSaved?: (next: number, previous: number) => void;
}) {
  const [value, setValue] = useState(String(stock));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: string) {
    const parsed = Math.max(0, Math.round(Number(next)));
    if (!Number.isFinite(parsed) || parsed === stock) {
      setValue(String(stock));
      return;
    }

    setState("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, color, size, stock: parsed }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not save.");
      }

      setValue(String(parsed));
      setState("saved");
      onSaved?.(parsed, stock);
      window.setTimeout(() => setState("idle"), 1600);
    } catch (caught) {
      setValue(String(stock));
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Could not save.");
      window.setTimeout(() => setState("idle"), 2600);
    }
  }

  const tone =
    state === "error"
      ? "border-ember/60 bg-ember/10"
      : stock === 0
        ? "border-ember/40 bg-ember/5"
        : stock <= 5
          ? "border-brass/50 bg-brass/10"
          : "border-ink/15 bg-bone";

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => save(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        disabled={state === "saving"}
        aria-label={`${color} ${size} stock`}
        className={`w-[68px] border px-2 py-1.5 text-center text-[12.5px] tabular-nums outline-none transition-colors focus:border-ink ${tone}`}
      />
      {state === "saving" && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-ink border-t-transparent" />
      )}
      {state === "saved" && <span className="text-[10px] text-brass">saved</span>}
      {state === "error" && (
        <span className="max-w-[92px] text-center text-[9.5px] leading-tight text-ember">
          {message ?? "error"}
        </span>
      )}
    </div>
  );
}
