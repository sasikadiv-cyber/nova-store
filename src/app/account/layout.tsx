import Link from "next/link";

import { CollapsibleNav } from "@/components/collapsible-nav";
import { NotificationBell, NotificationFeed } from "@/components/notification-bell";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "My account" };

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders & tracking" },
  { href: "/account/favourites", label: "Wishlist" },
  { href: "/account/reviews", label: "My reviews" },
  { href: "/account/profile", label: "Profile & address" },
];

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-5 py-16 md:px-10 md:py-24">
        <p className="eyebrow text-sage">Account</p>
        <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)]">Please sign in</h1>
        <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink-300">
          Sign in to follow your orders, review your pieces and keep your wishlist in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/account/login"
            className="bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
          >
            Sign in or create an account
          </Link>
          <Link
            href="/shop"
            className="border border-ink/15 px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-bone"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-12 md:px-10 md:py-16">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-14">
        <aside className="lg:w-[248px] lg:shrink-0">
          <div className="lg:sticky lg:top-[96px]">
            <p className="eyebrow text-sage">Signed in</p>
            <p className="mt-2.5 font-display text-[26px] leading-tight">{customer.fullName}</p>
            <p className="mt-1 truncate text-[12.5px] text-ink-300">{customer.email}</p>

            <CollapsibleNav label="Account menu" variant="account" sections={[{ items: NAV }]} />

            <form action={signOutAction} className="mt-7">
              <button
                type="submit"
                className="border border-ink/15 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="space-y-12">
            {children}

            {/* ---------------------------------------- notifications */}
            <section id="notifications" className="scroll-mt-24">
              <div className="border-b border-sand pb-5">
                <p className="eyebrow text-sage">Activity</p>
                <h2 className="mt-2 text-2xl">Notifications</h2>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-300">
                  Order updates, delivery changes and anything waiting for your review.
                </p>
              </div>
              <div className="pt-4">
                <NotificationFeed />
              </div>
            </section>
          </div>
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
