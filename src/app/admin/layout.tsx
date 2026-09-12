import Link from "next/link";

import { isAdmin, OWNER_EMAIL } from "@/lib/auth";
import { loginAction, logoutAction } from "./actions";
import { SubmitButton } from "@/components/admin/submit-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Store management" };

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products & stock" },
  { href: "/admin/stock", label: "Stock management" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/appearance", label: "Site appearance" },
  { href: "/admin/discounts", label: "Discount codes" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdmin();

  if (!authed) {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-bone">
        <div className="flex min-h-full items-center justify-center px-5 py-16">
          <form
            action={loginAction}
            className="w-full max-w-[420px] border border-sand bg-linen p-8 shadow-panel"
          >
            <p className="font-display text-[22px] tracking-[0.3em]">NOVA</p>
            <p className="eyebrow mt-3 text-sage">Store management</p>

            <h1 className="mt-6 text-3xl">Sign in</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-300">
              This area controls the live storefront — products, collections, discount codes,
              orders and stock. Restricted access.
            </p>

            <label className="mt-7 block">
              <span className="eyebrow text-ink-300">Email</span>
              <input
                name="email"
                id="nova-admin-email"
                type="email"
                required
                {...({ autocomplete: "username" } as Record<string, string>)}
                className="mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none focus:border-ink"
              />
            </label>

            <label className="mt-4 block">
              <span className="eyebrow text-ink-300">Password</span>
              <input
                name="password"
                id="nova-admin-password"
                type="password"
                required
                {...({ autocomplete: "current-password" } as Record<string, string>)}
                className="mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none focus:border-ink"
              />
            </label>

            <SubmitButton
              label="Enter console"
              pendingLabel="Signing in"
              className="mt-7 w-full bg-ink py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
            />

            <p className="mt-5 border-t border-sand pt-4 text-[11.5px] leading-relaxed text-ink-300">
              Sign in with your owner email:{" "}
              <span className="text-ink">{OWNER_EMAIL}</span>
              <br />
              The password is set in your environment as{" "}
              <code>ADMIN_PASSWORD</code>.
            </p>

            <Link
              href="/"
              className="link-underline mt-5 inline-block text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
            >
              Back to storefront
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-bone">
      <div className="flex min-h-full flex-col lg:flex-row">
        <aside className="border-b border-sand bg-linen lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 flex h-full flex-col p-6">
            <Link href="/admin" className="font-display text-[20px] tracking-[0.3em]">
              NOVA
            </Link>
            <p className="eyebrow mt-2 text-sage">Store management</p>

            <nav className="mt-9 flex flex-wrap gap-1 lg:flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-bone-dark px-3 py-2.5 text-[13px] text-ink-500 transition-colors hover:bg-bone-dark hover:text-ink lg:border-b lg:border-sand lg:px-0"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto hidden pt-8 lg:block">
              <Link
                href="/"
                className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
              >
                View storefront
              </Link>
              <form action={logoutAction} className="mt-4">
                <SubmitButton
                  label="Sign out"
                  pendingLabel="Signing out"
                  className="w-full border border-ink/15 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
                />
              </form>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4 border-b border-sand px-5 py-4 lg:hidden">
            <Link href="/" className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300">
              Storefront
            </Link>
            <form action={logoutAction}>
              <SubmitButton
                label="Sign out"
                pendingLabel="Signing out"
                className="border border-ink/15 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
              />
            </form>
          </div>

          <div className="mx-auto w-full max-w-[1320px] px-5 py-8 md:px-8 md:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
