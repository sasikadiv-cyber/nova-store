"use client";

import { useState } from "react";

/** Copies a value to the clipboard and confirms it briefly. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={`inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
        copied ? "bg-ok text-bone" : "border border-ink/20 text-ink-500 hover:border-ink hover:text-ink"
      }`}
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="9" y="9" width="11" height="11" rx="1.5" />
            <path d="M5 15V5a1 1 0 0 1 1-1h10" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
