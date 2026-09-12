import Link from "next/link";

import { CookiePreferencesLink } from "./cookie-preferences-link";
import { NewsletterForm } from "./newsletter-form";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "New In", href: "/shop?sort=newest" },
      { label: "Women", href: "/shop?genders=Women" },
      { label: "Men", href: "/shop?genders=Men" },
      { label: "Footwear", href: "/shop?categories=Footwear" },
      { label: "Knitwear", href: "/shop?categories=Knitwear" },
      { label: "Sale", href: "/shop?onSale=true" },
    ],
  },
  {
    title: "Collections",
    links: [
      { label: "The Winter Edit", href: "/shop?collection=winter-edit" },
      { label: "Elevated Essentials", href: "/shop?collection=elevated-essentials" },
      { label: "Footwear Atelier", href: "/shop?collection=footwear-atelier" },
      { label: "After Hours", href: "/shop?collection=after-hours" },
    ],
  },
  {
    title: "Client Care",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "My Account", href: "/account" },
      { label: "Track an Order", href: "/account/orders" },
      { label: "Global Shipping", href: "/shipping" },
      { label: "Returns & Exchanges", href: "/returns" },
      { label: "Size Guide", href: "/size-guide" },
      { label: "Product Care", href: "/product-care" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "Our Materials", href: "/materials" },
      { label: "Responsibility", href: "/responsibility" },
      { label: "Ateliers & Mills", href: "/ateliers" },
      { label: "Careers", href: "/careers" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="grain relative overflow-hidden bg-band text-ivory">
      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-md">
            <p className="font-display text-3xl tracking-[0.3em]">NOVA</p>
            <p className="mt-5 text-[13.5px] leading-relaxed text-ivory/65">
              Considered clothing and footwear, made in small runs with mills and ateliers in Biella,
              Okayama, Porto and Inner Mongolia. Shipped to 94 countries with duties included.
            </p>
            <div className="mt-8">
              <p className="eyebrow text-ivory/50">Join the list</p>
              <div className="mt-3">
                <NewsletterForm />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="eyebrow text-ivory/45">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="link-underline text-[13.5px] text-ivory/80">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-ivory/12 pt-7 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[11.5px] text-ivory/50">
            <span>© {new Date().getFullYear()} Nova Global Commerce</span>
            <Link href="/privacy" className="link-underline transition-colors hover:text-ivory">
              Privacy
            </Link>
            <Link href="/terms" className="link-underline transition-colors hover:text-ivory">
              Terms
            </Link>
            <Link
              href="/accessibility"
              className="link-underline transition-colors hover:text-ivory"
            >
              Accessibility
            </Link>
            <CookiePreferencesLink />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {["VISA", "MC", "AMEX", "PAYPAL", "APPLE PAY", "KLARNA"].map((method) => (
              <span
                key={method}
                className="border border-ivory/18 px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-ivory/60"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
