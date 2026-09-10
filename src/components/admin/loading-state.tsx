"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Connecting to the store database…",
  "Reading the catalogue…",
  "Counting stock levels…",
  "Pricing and discounts…",
  "Almost ready…",
];

/**
 * Live loading state for the console — an elapsed clock, a moving progress
 * meter and rotating status copy so slow queries still feel responsive.
 */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      setElapsed(performance.now() - started);
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  // Eases towards 95% so the bar is always moving but never finishes early.
  const progress = Math.min(95, 100 * (1 - Math.exp(-elapsed / 900)));
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(elapsed / 700))];

  return (
    <div className="animate-fade-in">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-4 h-10 w-64 max-w-full" />
      <div className="skeleton mt-3 h-3 w-80 max-w-full" />

      <div className="mt-9 grid gap-px border border-sand bg-sand sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-linen p-6">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-4 h-8 w-24" />
            <div className="skeleton mt-3 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-10 border border-sand bg-linen p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink border-t-transparent" />
            <span className="eyebrow text-ink-300">{label}</span>
          </div>
          <span className="font-mono text-[12px] tabular-nums text-ink-300">
            {(elapsed / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="mt-3 h-[3px] w-full overflow-hidden bg-sand">
          <div
            className="h-full bg-brass transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-[12.5px] text-ink-500">{stage}</p>
      </div>
    </div>
  );
}
