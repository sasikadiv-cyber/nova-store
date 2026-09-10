"use client";

import { useFormStatus } from "react-dom";

/**
 * Instant feedback for server-action forms.
 *
 * `useFormStatus` reports whether the enclosing <form> is mid-submission, so
 * these work with plain progressive-enhancement forms — no client-side
 * submit handlers needed. The button also disables itself while pending,
 * which prevents the double-submit that used to create duplicate products.
 */

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  className = "",
  name,
  value,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
  /** Lets several buttons in one form submit different modes. */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={`relative inline-flex items-center justify-center gap-2 transition-opacity ${
        pending ? "cursor-wait opacity-70" : ""
      } ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel ?? label}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

/** Covers the whole form with a light veil while the action runs. */
export function PendingOverlay({ label = "Saving your changes" }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div className="animate-fade-in pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-bone/70 pt-20 backdrop-blur-[2px]">
      <div className="pointer-events-auto flex items-center gap-3 border border-sand bg-linen px-5 py-3.5 shadow-panel">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink border-t-transparent" />
        <span className="eyebrow text-ink-500">{label}…</span>
      </div>
    </div>
  );
}

/** Compact inline "saving…" note for one-field forms. */
export function PendingNote({ label = "Working" }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <span className="animate-fade-in mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-brass">
      <Spinner className="h-3 w-3" />
      {label}…
    </span>
  );
}
