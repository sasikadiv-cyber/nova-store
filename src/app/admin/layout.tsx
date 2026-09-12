import Link from "next/link";

import { AdminLoginForm } from "@/components/admin/login-form";
import { CollapsibleNav } from "@/components/collapsible-nav";
import { getCurrentAdmin } from "@/lib/auth";
import { logoutAction } from "./actions";
import { SubmitButton } from "@/components/admin/submit-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Store management" };

/* Every console role reaches these. */
const BASE_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/messages", label: "Messages" },
];

/* Stock managers additionally run the catalogue. */
const MANAGER_NAV = [
  { href: "/admin/products", label: "Products & stock" },
  { href: "/admin/stock", label: "Stock management" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/gift-cards", label: "Gift cards" },
  { href: "/admin/discounts", label: "Discount codes" },
];

/* Store-owner only: the storefront itself, pricing and the team. */
const OWNER_NAV = [
  { href: "/admin/appearance", label: "Site appearance" },
  { href: "/admin/pages", label: "Site pages" },
  { href: "/admin/currency", label: "Currency rules" },
  { href: "/admin/team", label: "Team & access" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-bone">
        <div className="flex min-h-full items-center justify-center px-5 py-16">
          <AdminLoginForm />
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

            <p className="mt-8 border-t border-sand pt-5 text-[12.5px] leading-relaxed">
              <span className="block text-ink">{admin.name}</span>
              <span className="block break-all text-ink-300">{admin.email}</span>
              <span
                className={`mt-2 inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                  admin.role === "owner" ? "bg-brass/15 text-brass" : "bg-sage-tint text-sage"
                }`}
              >
                {admin.role === "owner"
                  ? "Store owner"
                  : admin.role === "support"
                    ? "Client support"
                    : "Stock manager"}
              </span>
            </p>

            <CollapsibleNav
              sections={[
                { items: BASE_NAV },
                ...(admin.role !== "support"
                  ? [{ title: "Catalogue", items: MANAGER_NAV }]
                  : []),
                ...(admin.role === "owner" ? [{ title: "Store owner", items: OWNER_NAV }] : []),
                { title: "Signed in", items: [{ href: "/admin/profile", label: "Profile" }] },
              ]}
            />

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
