"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** A quick-filter chip that shows it is working while the page reloads. */
export function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.push(href))}
      aria-busy={pending}
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[11.5px] transition-colors ${
        active
          ? "border-ink bg-ink text-bone"
          : pending
            ? "border-ink/45 bg-bone-dark text-ink"
            : "border-ink/15 text-ink-500 hover:border-ink/45"
      }`}
    >
      {pending && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
