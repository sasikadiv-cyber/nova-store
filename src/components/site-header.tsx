"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CURRENCY_LIST, type CurrencyCode } from "@/lib/currency";
import { useStore } from "./store-provider";

/* Top-level rail stays deliberately short; Men / Women live inside the
   Collections panel so the bar never feels crowded. */
const NAV_LINKS = [
  { href: "/shop?categories=Footwear", label: "Footwear" },
  { href: "/shop?categories=Outerwear", label: "Outerwear" },
];

const COLLECTION_LINKS = [
  { href: "/shop?collection=winter-edit", label: "The Winter Edit", tagline: "Sculpted outerwear" },
  { href: "/shop?collection=elevated-essentials", label: "Elevated Essentials", tagline: "Cashmere & merino" },
  { href: "/shop?collection=footwear-atelier", label: "The Footwear Atelier", tagline: "Made in Porto" },
  { href: "/shop?collection=after-hours", label: "After Hours", tagline: "Liquid silk" },
];

const AUDIENCE_LINKS = [
  { href: "/shop?genders=Men", label: "Men" },
  { href: "/shop?genders=Women", label: "Women" },
];

export type HeaderNav = {
  home: string;
  collections: string;
  footwear: string;
  outerwear: string;
  shopAll: string;
  myAccount: string;
};

export type HeaderAnnouncement = {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkHref: string;
};

export function SiteHeader({
  nav = {
    home: "Home",
    collections: "Collections",
    footwear: "Footwear",
    outerwear: "Outerwear",
    shopAll: "Shop All",
    myAccount: "My Account",
  },
  announcement,
}: {
  nav?: HeaderNav;
  announcement?: HeaderAnnouncement;
}) {
  const { itemCount, openCart, currency, setCurrency, toggleTheme } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Pages that open with a dark, full-bleed band sitting under the header.
  const hasDarkBand = pathname === "/" || pathname.startsWith("/shop");
  const overBand = hasDarkBand && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCollectionOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/shop?search=${encodeURIComponent(term)}` : "/shop");
    setSearchOpen(false);
  };

  const showAnnouncement = Boolean(announcement?.enabled && announcement.text.trim());

  return (
    <>
      {showAnnouncement && (
        <div className="border-b border-ink/10 bg-ink text-bone">
          <div className="mx-auto flex min-h-[34px] w-full max-w-[1600px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-2 md:px-10">
            <p className="text-center text-[11px] tracking-[0.08em] text-bone/90">
              {announcement!.text}
            </p>
            {announcement!.linkLabel.trim() && (
              <Link
                href={announcement!.linkHref || "/shop"}
                className="link-underline shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-brass-light"
              >
                {announcement!.linkLabel}
              </Link>
            )}
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-[110] transition-colors duration-500 ${
          overBand
            ? "bg-transparent text-ivory"
            : "border-b border-ink/10 bg-bone/90 text-ink backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto grid h-[68px] w-full max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:gap-4 md:h-[76px] md:px-10">
          {/* ------------------------------------------------------- left */}
          <div className="flex min-w-0 items-center gap-6">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="-ml-1 grid h-10 w-10 shrink-0 place-items-center lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                <path d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </button>

            <nav className="hidden items-center gap-8 text-[11.5px] font-medium uppercase tracking-[0.16em] lg:flex">
              <Link href="/" className="link-underline py-2">
                {nav.home}
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setCollectionOpen(true)}
                onMouseLeave={() => setCollectionOpen(false)}
              >
                <button
                  type="button"
                  aria-expanded={collectionOpen}
                  onClick={() => setCollectionOpen((value) => !value)}
                  className="link-underline flex items-center gap-1.5 py-2"
                >
                  <span>{nav.collections}</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    fill="none"
                    className={`shrink-0 self-center transition-transform duration-300 ${
                      collectionOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div
                  className={`absolute left-0 top-full w-[330px] origin-top-left pt-3 transition-all duration-300 ${
                    collectionOpen
                      ? "pointer-events-auto scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0"
                  }`}
                >
                  <div className="border border-ink/10 bg-bone p-2 text-ink shadow-panel">
                    <p className="eyebrow px-4 pb-1.5 pt-2 text-ink-300">By collection</p>
                    {COLLECTION_LINKS.map((collection) => (
                      <Link
                        key={collection.href}
                        href={collection.href}
                        className="block px-4 py-2.5 transition-colors hover:bg-bone-dark"
                      >
                        <span className="text-[13px]">{collection.label}</span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-300">
                          {collection.tagline}
                        </span>
                      </Link>
                    ))}

                    <div className="my-2 border-t border-ink/10" />

                    <p className="eyebrow px-4 pb-1.5 pt-1.5 text-ink-300">Shop for</p>
                    <div className="grid grid-cols-2 gap-1">
                      {AUDIENCE_LINKS.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          className="px-4 py-2.5 text-[13px] transition-colors hover:bg-bone-dark"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    <Link
                      href="/shop"
                      className="mt-1 block border-t border-ink/10 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-bone"
                    >
                      Shop everything
                    </Link>
                  </div>
                </div>
              </div>

              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="link-underline py-2">
                  {link.href.includes("Footwear") ? nav.footwear : nav.outerwear}
                </Link>
              ))}
            </nav>
          </div>

          {/* ------------------------------------------------------ centre */}
          <Link href="/" aria-label="Nova home" className="flex items-center leading-none">
            <span className="font-display text-[19px] tracking-[0.26em] sm:text-[23px] sm:tracking-[0.3em] md:text-[27px] md:tracking-[0.34em]">
              NOVA
            </span>
          </Link>

          {/* ------------------------------------------------------ right */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1 md:gap-2">
            <form
              onSubmit={submitSearch}
              className={`hidden items-center overflow-hidden transition-all duration-500 md:flex ${
                searchOpen ? "w-48" : "w-0"
              }`}
            >
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Search pieces…"
                aria-label="Search products"
                className={`h-9 w-full border-b bg-transparent pb-1 text-[13px] outline-none transition-colors ${
                  overBand ? "border-ivory/40 placeholder:text-ivory/50" : "border-ink/25 placeholder:text-ink-300"
                }`}
              />
            </form>

            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-label="Search"
              className="grid h-10 w-10 place-items-center transition-opacity hover:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4.2-4.2" />
              </svg>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
              title="Toggle light and dark theme"
              className="grid h-10 w-10 place-items-center transition-opacity hover:opacity-60"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="icon-moon"
                aria-hidden="true"
              >
                <path d="M20.5 14.2A8.6 8.6 0 1 1 9.8 3.5a6.9 6.9 0 0 0 10.7 10.7z" />
              </svg>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="icon-sun"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4.1" />
                <path d="M12 2.7v2.2M12 19.1v2.2M2.7 12h2.2M19.1 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6" />
              </svg>
            </button>

            <label className="hidden lg:flex">
              <span className="sr-only">Currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                className="cursor-pointer appearance-none bg-transparent px-2 text-[12px] font-medium uppercase tracking-[0.14em] outline-none transition-opacity hover:opacity-60"
              >
                {CURRENCY_LIST.map((item) => (
                  <option key={item.code} value={item.code} className="text-ink">
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <Link
              href="/account"
              aria-label="My account"
              title="My account"
              className="grid h-10 w-10 place-items-center transition-opacity hover:opacity-60"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="12" cy="8.2" r="3.8" />
                <path d="M4.5 20.5c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={`Open bag, ${itemCount} items`}
              className="relative grid h-10 w-10 place-items-center transition-opacity hover:opacity-60"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M6 8h12l-1 12H7L6 8zM9 8a3 3 0 0 1 6 0" />
              </svg>
              <span
                className={`absolute right-0 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brass px-1 text-[10px] font-medium tabular-nums text-bone transition-transform duration-300 ${
                  itemCount > 0 ? "scale-100" : "scale-0"
                }`}
              >
                {itemCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- mobile menu */}
      <div
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-[130] lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-scrim/45 backdrop-blur-[2px] transition-opacity duration-400 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute left-0 top-0 h-full w-[86%] max-w-[380px] overflow-y-auto bg-bone px-6 py-7 text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xl tracking-[0.3em]">NOVA</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-ink/15"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          <nav className="mt-9 flex flex-col">
            {[
              { href: "/", label: nav.home },
              { href: "/account", label: nav.myAccount },
              { href: "/shop", label: nav.shopAll },
              ...AUDIENCE_LINKS,
              { href: NAV_LINKS[0].href, label: nav.footwear },
              { href: NAV_LINKS[1].href, label: nav.outerwear },
            ].map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="border-b border-ink/8 py-4 font-display text-[26px] leading-none"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="eyebrow mt-9 text-ink-300">Collections</p>
          <div className="mt-3 flex flex-col gap-3">
            {COLLECTION_LINKS.map((collection) => (
              <Link
                key={collection.href}
                href={collection.href}
                className="flex items-baseline justify-between gap-3 text-[13.5px]"
              >
                <span>{collection.label}</span>
                <span className="shrink-0 text-[11.5px] text-ink-300">{collection.tagline}</span>
              </Link>
            ))}
          </div>

          <div className="mt-9">
            <p className="eyebrow text-ink-300">Currency</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CURRENCY_LIST.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setCurrency(item.code)}
                  className={`border px-3 py-1.5 text-[11.5px] tracking-[0.1em] transition-colors ${
                    currency === item.code
                      ? "border-ink bg-ink text-bone"
                      : "border-ink/15 text-ink-300 hover:border-ink/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
