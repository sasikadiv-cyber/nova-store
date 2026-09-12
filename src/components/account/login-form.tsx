"use client";

import Link from "next/link";
import { useState } from "react";


const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

/**
 * Posts to /api/customer/session rather than a server action, then hard-navigates
 * so the freshly created session is reflected immediately everywhere.
 */
export function LoginForm({
  initialMode,
  redirectTo = "/account",
}: {
  initialMode: "signin" | "signup";
  /** Where to land after a successful sign in (e.g. back to checkout). */
  redirectTo?: string;
}) {
  const [signup, setSignup] = useState(initialMode === "signup");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: signup ? "signup" : "signin",
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          fullName: String(data.get("fullName") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not sign you in.");
      }

      window.location.assign(redirectTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign you in.");
      setPending(false);
    }
  }

  return (
    <div className="border border-sand bg-linen p-6 md:p-8">
      <div className="grid grid-cols-2 border border-ink/12">
        <button
          type="button"
          onClick={() => {
            setSignup(false);
            setError(null);
          }}
          className={`py-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
            signup ? "text-ink-300 hover:text-ink" : "bg-ink text-bone"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setSignup(true);
            setError(null);
          }}
          className={`py-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
            signup ? "bg-ink text-bone" : "text-ink-300 hover:text-ink"
          }`}
        >
          Create account
        </button>
      </div>

      {error && (
        <p className="mt-6 border-l-2 border-ember bg-bone px-4 py-3 text-[13px] text-ember">
          {error}
        </p>
      )}

      {/* A real form with autocomplete hints, so Chrome, Safari and Google
          Password Manager offer to save and then autofill these credentials. */}
      <form
        onSubmit={onSubmit}
        action="/account"
        method="post"
        className="mt-6 space-y-5"
      >
        {signup && (
          <label className="block">
            <span className={label}>Full name</span>
            <input
              name="fullName"
              id="nova-signup-name"
              {...({ autocomplete: "name" } as Record<string, string>)}
              required
              className={field}
              placeholder="Amelie Laurent"
            />
          </label>
        )}

        <label className="block">
          <span className={label}>Email</span>
          <input
            name="email"
            id={signup ? "nova-signup-email" : "nova-signin-email"}
            type="email"
            required
            {...({ autocomplete: "username" } as Record<string, string>)}
            defaultValue={signup ? "" : ""}
            className={field}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className={label}>Password</span>
          <input
            name="password"
            id={signup ? "nova-signup-password" : "nova-signin-password"}
            type="password"
            required
            minLength={signup ? 8 : 1}
            {...({ autocomplete: signup ? "new-password" : "current-password" } as Record<string, string>)}
            className={field}
            placeholder={signup ? "At least 8 characters" : "Your password"}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={`inline-flex w-full items-center justify-center gap-2 bg-ink py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700 ${
            pending ? "cursor-wait opacity-70" : ""
          }`}
        >
          {pending && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {pending
            ? signup
              ? "Creating account"
              : "Signing in"
            : signup
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-6 border-t border-sand pt-5 text-[11.5px] leading-relaxed text-ink-300">
        By continuing you agree to our terms of sale and privacy policy. Card details are never
        stored in full — only the brand and last four digits.
      </p>

      <Link
        href="/shop"
        className="link-underline mt-5 inline-block text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
      >
        Continue shopping
      </Link>
    </div>
  );
}
