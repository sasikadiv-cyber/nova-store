import Link from "next/link";

import { ensureDemoCustomer } from "@/lib/customer-queries";
import { DEMO_CUSTOMER } from "@/lib/demo-account";
import { LoginForm } from "@/components/account/login-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Fire and forget: awaiting this would suspend the page and push the form
  // into a streamed segment, so it would not appear in the first paint.
  void ensureDemoCustomer();

  const mode = params.mode === "signup" ? "signup" : "signin";
  /* Send the client back where they came from — typically the checkout. */
  const rawNext = typeof params.next === "string" ? params.next : "";
  const redirectTo = rawNext.startsWith("/") ? rawNext : "/account";
  const error = typeof params.error === "string" ? params.error : null;

  const signup = mode === "signup";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-14 md:px-10 md:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="eyebrow text-sage">Account</p>
          <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)]">
            {signup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-ink-500">
            {signup
              ? "Keep your orders, tracking, reviews and payment details in one place — and check out in a couple of taps."
              : "Sign in to follow your deliveries, review your pieces and check out faster."}
          </p>

          <ul className="mt-9 space-y-3.5">
            {[
              "Live order tracking from the atelier to your door",
              "Full order history and downloadable receipts",
              "Saved cards for one-tap checkout",
              "Your reviews, editable any time",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[13.5px] text-ink-500">
                <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-brass" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 border border-sand bg-linen p-5">
            <p className="eyebrow text-sage">Demo account</p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">
              Email <span className="text-ink">{DEMO_CUSTOMER.email}</span>
              <br />
              Password <span className="text-ink">{DEMO_CUSTOMER.password}</span>
            </p>
          </div>
        </div>

        <LoginForm initialMode={mode} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
