"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Daraz-style review composer shown against each item of a delivered order.
 * Only appears once the order is delivered, and only one review per piece.
 */
export function ReviewComposer({
  productId,
  productName,
  alreadyReviewed,
}: {
  productId: number;
  productName: string;
  alreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyReviewed);

  if (done) {
    return (
      <p className="mt-3 flex items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-brass">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        Reviewed — thank you
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 border border-ink/15 px-4 py-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink hover:bg-ink hover:text-bone"
      >
        ★ Write a review
      </button>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, body }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not save your review.");
      }

      setDone(true);
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your review.");
      setPending(false);
    }
  }

  const shown = hover || rating;

  return (
    <form
      onSubmit={submit}
      className="mt-3 w-full max-w-lg border border-sand bg-linen p-4"
    >
      <p className="eyebrow text-sage">Reviewing {productName}</p>

      <div className="mt-3 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={`text-[24px] leading-none transition-transform hover:scale-110 ${
              star <= shown ? "text-brass" : "text-ink/20"
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-[11.5px] text-ink-300">{rating} of 5</span>
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        minLength={3}
        placeholder="Headline (e.g. Worth every cent)"
        className="mt-3.5 w-full border border-ink/15 bg-bone px-3 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink"
      />

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
        minLength={10}
        rows={3}
        placeholder="How did it fit, feel and wear?"
        className="mt-2.5 w-full border border-ink/15 bg-bone px-3 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink"
      />

      {error && <p className="mt-2.5 text-[12px] text-ember">{error}</p>}

      <div className="mt-3.5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={`inline-flex items-center gap-2 bg-ink px-6 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700 ${
            pending ? "cursor-wait opacity-70" : ""
          }`}
        >
          {pending && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {pending ? "Publishing" : "Publish review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="link-underline text-[11.5px] uppercase tracking-[0.14em] text-ink-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
