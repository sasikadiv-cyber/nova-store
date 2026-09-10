"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Error boundary for the store-management console. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[nova] admin render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <p className="eyebrow text-sage">Console error</p>
      <h1 className="text-[clamp(1.8rem,4vw,2.8rem)]">This panel did not load</h1>
      <p className="max-w-md text-[13.5px] leading-relaxed text-ink-300">
        The database may have been briefly unavailable, or the record you opened no longer exists.
        Retrying usually resolves it.
      </p>

      {error.digest && (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-300">
          Reference {error.digest}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="border border-ink/15 px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-bone"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
