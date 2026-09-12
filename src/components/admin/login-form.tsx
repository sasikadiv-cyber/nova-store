"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AdminLoginState } from "@/app/admin/actions";

import { SubmitButton } from "./submit-button";

const INITIAL: AdminLoginState = { error: null };

/**
 * Console sign-in. Uses `useActionState` so a rejected credential is reported
 * on the form itself — the owner always sees why the sign-in failed.
 */
export function AdminLoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL);

  return (
    <form
      action={formAction}
      className="w-full max-w-[420px] border border-sand bg-linen p-8 shadow-panel"
    >
      <p className="font-display text-[22px] tracking-[0.3em]">NOVA</p>
      <p className="eyebrow mt-3 text-sage">Store management</p>

      <h1 className="mt-6 text-3xl">Sign in</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-300">
        This area controls the live storefront — products, collections, discount codes,
        orders and stock. Restricted access.
      </p>

      {state.error && (
        <p
          role="alert"
          className="mt-6 border-l-2 border-ember bg-bone px-4 py-3 text-[13px] leading-relaxed text-ember"
        >
          {state.error}
        </p>
      )}

      <label className="mt-7 block">
        <span className="eyebrow text-ink-300">Email</span>
        <input
          name="email"
          id="nova-admin-email"
          type="email"
          placeholder="you@nova.com"
          required
          {...({ autocomplete: "username" } as Record<string, string>)}
          className="mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
        />
      </label>

      <label className="mt-4 block">
        <span className="eyebrow text-ink-300">Password</span>
        <input
          name="password"
          id="nova-admin-password"
          type="password"
          placeholder="••••••••"
          required
          {...({ autocomplete: "current-password" } as Record<string, string>)}
          className="mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
        />
      </label>

      <SubmitButton
        label="Enter console"
        pendingLabel="Signing in"
        className="mt-7 w-full bg-ink py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
      />

      <Link
        href="/"
        className="link-underline mt-5 inline-block text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
      >
        Back to storefront
      </Link>
    </form>
  );
}
