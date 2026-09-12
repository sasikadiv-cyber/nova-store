"use client";

import { useState } from "react";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

/** Sends a message to the console inbox through /api/contact. */
export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          subject: String(data.get("subject") ?? ""),
          message: String(data.get("message") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not send your message.");
      }

      form.reset();
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send your message.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 border border-sand bg-linen px-6 py-10 text-center">
        <p className="font-display text-2xl">Thank you</p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
          Your message is with the studio — a client adviser replies within one working day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {error && (
        <p role="alert" className="border-l-2 border-ember bg-bone px-4 py-3 text-[13px] text-ember">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Your name</span>
          <input name="name" required minLength={2} className={field} placeholder="Amelie Laurent" />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input
            name="email"
            type="email"
            required
            {...({ autocomplete: "email" } as Record<string, string>)}
            className={field}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="block">
        <span className={label}>Subject</span>
        <select name="subject" className={field} defaultValue="Order enquiry">
          {["Order enquiry", "Sizing advice", "Returns & exchanges", "Repairs", "Press", "Something else"].map(
            (option) => (
              <option key={option} value={option} className="text-ink">
                {option}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="block">
        <span className={label}>Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          rows={6}
          className={`${field} resize-none`}
          placeholder="How can we help?"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`inline-flex items-center justify-center gap-2 bg-ink px-9 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700 ${
          pending ? "cursor-wait opacity-70" : ""
        }`}
      >
        {pending && (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
        )}
        {pending ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
