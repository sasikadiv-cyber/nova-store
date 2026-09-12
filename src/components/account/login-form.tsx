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
  const [forgot, setForgot] = useState(false);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  /** Step 1 — the client proves who they are by requesting a code. */
  async function onRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/customer/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(data.get("email") ?? "") }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; code?: string; error?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not start the reset.");
      }
      setResetCode(payload.code ?? "");
      setResetNotice(
        payload.code
          ? "Verification code generated — it expires in 15 minutes. On a hosted store this is emailed rather than shown."
          : "If that email has an account, a code is on its way.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the reset.");
    } finally {
      setPending(false);
    }
  }

  /** Step 2 — the code plus a new password. */
  async function onConfirmReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/customer/reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          code: String(data.get("code") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not reset your password.");
      }
      setForgot(false);
      setResetCode(null);
      setResetNotice("Your password has been changed — sign in with the new one.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset your password.");
    } finally {
      setPending(false);
    }
  }
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

      {resetNotice && (
        <p className="mt-6 border-l-2 border-ok bg-sage-tint px-4 py-3 text-[13px] leading-relaxed text-ok">
          {resetNotice}
        </p>
      )}

      {error && (
        <p className="mt-6 border-l-2 border-ember bg-bone px-4 py-3 text-[13px] text-ember">
          {error}
        </p>
      )}

      {forgot ? (
        resetCode === null ? (
          <form onSubmit={onRequestReset} className="mt-6 space-y-5">
            <label className="block">
              <span className={label}>Email</span>
              <input name="email" type="email" required className={field} placeholder="you@example.com" />
            </label>
            <button
              type="submit"
              disabled={pending}
              className={`inline-flex w-full items-center justify-center gap-2 bg-ink py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700 ${pending ? "cursor-wait opacity-70" : ""}`}
            >
              {pending ? "Sending code" : "Send verification code"}
            </button>
            <button
              type="button"
              onClick={() => { setForgot(false); setError(null); }}
              className="link-underline w-full text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={onConfirmReset} className="mt-6 space-y-5">
            <label className="block">
              <span className={label}>Email</span>
              <input name="email" type="email" required className={field} placeholder="you@example.com" />
            </label>
            <label className="block">
              <span className={label}>Verification code</span>
              <input name="code" required inputMode="numeric" className={field} placeholder="6-digit code" />
            </label>
            <label className="block">
              <span className={label}>New password (min 8 characters)</span>
              <input name="password" type="password" required minLength={8} className={field} placeholder="••••••••" />
            </label>
            <button
              type="submit"
              disabled={pending}
              className={`inline-flex w-full items-center justify-center gap-2 bg-ink py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700 ${pending ? "cursor-wait opacity-70" : ""}`}
            >
              {pending ? "Changing password" : "Change my password"}
            </button>
          </form>
        )
      ) : (
        /* A real form with autocomplete hints, so Chrome, Safari and Google
           Password Manager offer to save and then autofill these credentials. */
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
      )}

      {!forgot && (
        <button
          type="button"
          onClick={() => { setForgot(true); setError(null); setResetCode(null); setResetNotice(null); }}
          className="link-underline mt-5 text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
        >
          Forgot your password?
        </button>
      )}

      <p className="mt-6 border-t border-sand pt-5 text-[11.5px] leading-relaxed text-ink-300">
        By continuing you agree to our terms of sale and privacy policy. Card details are only
        entered at checkout and are never stored on your account.
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
