"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Global Server Components error boundary.
 *
 * Without this, any server-side render failure during a client-side
 * navigation surfaces as an uncaught "An error occurred in the Server
 * Components render" error in the console and an unstyled browser error page.
 * With it, the client gets a branded, recoverable state.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Kept on the client only — the production build masks the message anyway.
    console.error("[nova] render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="eyebrow text-sage">Something went wrong</p>
      <h1 className="display-xl text-[clamp(2.4rem,6vw,4.2rem)]">
        This page did not
        <span className="italic text-brass"> load</span>
      </h1>
      <p className="max-w-md text-[14.5px] leading-relaxed text-ink-300">
        The server hit an unexpected problem while rendering this page. Retrying usually resolves
        it — your bag and account are unaffected.
      </p>

      {error.digest && (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-300">
          Reference {error.digest}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="bg-ink px-9 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="link-underline text-[11.5px] uppercase tracking-[0.18em] text-ink-300"
        >
          Back to home
        </Link>
        <Link
          href="/shop"
          className="link-underline text-[11.5px] uppercase tracking-[0.18em] text-ink-300"
        >
          Shop the collection
        </Link>
      </div>
    </div>
  );
}
