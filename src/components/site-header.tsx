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

  /* Close any open overlay as soon as the route changes. Tracked during
     render (React's recommended pattern) instead of a post-render effect. */
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
    setCollectionOpen(false);
  }

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
        <div className="mx-auto grid h-[60px] w-full max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 min-[360px]:h-[68px] min-[360px]:gap-3 min-[360px]:px-4 sm:gap-4 md:h-[76px] md:px-10">
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
            <span className="font-display text-[16px] tracking-[0.2em] min-[360px]:text-[19px] min-[360px]:tracking-[0.26em] sm:text-[23px] sm:tracking-[0.3em] md:text-[27px] md:tracking-[0.34em]">
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
              className="hidden h-10 w-10 place-items-center transition-opacity hover:opacity-60 md:grid"
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
              className="hidden h-10 w-10 place-items-center transition-opacity hover:opacity-60 md:grid"
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

            <AccountMenu currency={currency} setCurrency={setCurrency} />

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
          className={`absolute left-0 top-0 h-full w-[88%] max-w-[360px] overflow-y-auto bg-bone px-5 py-6 text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] min-[360px]:px-6 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg tracking-[0.28em]">NOVA</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="grid h-9 w-9 place-items-center rounded-full border border-ink/15"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          {/* --------------------------------------------------- main links */}
          <nav className="mt-7 flex flex-col">
            {[
              { href: "/", label: nav.home },
              { href: "/shop", label: nav.shopAll },
              ...AUDIENCE_LINKS,
              { href: NAV_LINKS[0].href, label: nav.footwear },
              { href: NAV_LINKS[1].href, label: nav.outerwear },
            ].map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-ink/8 py-3 text-[14.5px] leading-tight transition-colors hover:text-brass"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* -------------------------------------------------- collections */}
          <p className="eyebrow mt-7 text-ink-300">Collections</p>
          <div className="mt-2 flex flex-col">
            {COLLECTION_LINKS.map((collection) => (
              <Link
                key={collection.href}
                href={collection.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-ink/8 py-2.5 text-[13.5px] leading-tight text-ink-500 transition-colors hover:text-ink"
              >
                {collection.label}
              </Link>
            ))}
          </div>

          {/* ------------------------------------------- account & settings */}
          <p className="eyebrow mt-7 text-ink-300">Account</p>
          <div className="mt-2 flex flex-col">
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="border-b border-ink/8 py-2.5 text-[13.5px] text-ink-500 transition-colors hover:text-ink"
            >
              {nav.myAccount}
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setMenuOpen(false)}
              className="border-b border-ink/8 py-2.5 text-[13.5px] text-ink-500 transition-colors hover:text-ink"
            >
              Track an order
            </Link>
            <Link
              href="/help"
              onClick={() => setMenuOpen(false)}
              className="border-b border-ink/8 py-2.5 text-[13.5px] text-ink-500 transition-colors hover:text-ink"
            >
              Help centre
            </Link>
          </div>

          {/* ---------------------------------------------- theme + currency */}
          <div className="mt-7 flex items-center justify-between border-y border-ink/8 py-4">
            <span className="text-[13px] text-ink-500">Appearance</span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
              className="inline-flex items-center gap-2 border border-ink/15 px-3 py-1.5 text-[11.5px] uppercase tracking-[0.14em] text-ink-500 transition-colors hover:border-ink hover:text-ink"
            >
              <svg
                width="14"
                height="14"
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
                width="14"
                height="14"
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
              Theme
            </button>
          </div>

          <div className="mt-5">
            <p className="eyebrow text-ink-300">Currency</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CURRENCY_LIST.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setCurrency(item.code)}
                  className={`border px-2.5 py-1.5 text-[11px] tracking-[0.1em] transition-colors ${
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

/* ------------------------------------------------------------ account menu */

type SessionCustomer = { id: number; email: string; fullName: string } | null;

const LOCATIONS = [
  "France",
  "United Kingdom",
  "United States",
  "Germany",
  "Netherlands",
  "Sri Lanka",
  "Singapore",
  "United Arab Emirates",
  "Japan",
  "Australia",
];

const ACCOUNT_LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders & tracking" },
  { href: "/account/favourites", label: "Wishlist" },
];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The account button opens a panel instead of jumping straight to the account
 * page — the way large storefronts do it. Holds the session summary, quick
 * links, the currency and shipping location pickers, and sign out.
 */
function AccountMenu({
  currency,
  setCurrency,
}: {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<SessionCustomer>(null);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Who is signed in — rechecked every time the panel opens. */
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/customer/session")
      .then((response) => response.json())
      .then((data) => {
        if (active) setCustomer(data?.customer ?? null);
      })
      .catch(() => {
        /* keep whatever we already know */
      });
    return () => {
      active = false;
    };
  }, [open]);

  /* The shipping location is a browser preference, like the currency. Read
     after the frame paints so hydration stays in sync with the server. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("nova.location");
        if (stored && LOCATIONS.includes(stored)) setLocation(stored);
      } catch {
        /* storage unavailable */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  /* Click outside or press Escape to close. */
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function chooseLocation(value: string) {
    setLocation(value);
    try {
      window.localStorage.setItem("nova.location", value);
    } catch {
      /* ignore */
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/customer/session", { method: "DELETE" });
      window.location.assign("/");
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="My account"
        aria-expanded={open}
        title="My account"
        className="hidden h-10 w-10 place-items-center transition-opacity hover:opacity-60 md:grid"
      >
        {customer ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[11px] font-medium tracking-[0.06em] text-bone">
            {initialsOf(customer.fullName) || "N"}
          </span>
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="8.2" r="3.8" />
            <path d="M4.5 20.5c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[170] w-[290px] max-w-[calc(100vw-2.5rem)] border border-sand bg-linen text-ink shadow-lift">
          {/* ------------------------------------------------ session summary */}
          <div className="flex items-center gap-3.5 border-b border-sand px-5 py-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-medium tracking-[0.06em] text-bone">
              {customer ? initialsOf(customer.fullName) || "N" : "?"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px]">
                {customer ? customer.fullName : "Welcome to Nova"}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-ink-300">
                {customer ? customer.email : "Sign in to see your orders"}
              </span>
            </span>
          </div>

          {/* ------------------------------------------------------ quick links */}
          <nav className="py-2">
            {ACCOUNT_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-5 py-2.5 text-[13px] text-ink-500 transition-colors hover:bg-bone hover:text-ink"
              >
                {item.label}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </nav>

          {/* ------------------------------------------- currency and location */}
          <div className="space-y-4 border-t border-sand px-5 py-5">
            <label className="block">
              <span className="eyebrow text-ink-300">Currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                className="mt-2 w-full cursor-pointer appearance-none border border-ink/15 bg-bone px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-ink"
              >
                {CURRENCY_LIST.map((item) => (
                  <option key={item.code} value={item.code} className="text-ink">
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="eyebrow text-ink-300">Shipping location</span>
              <select
                value={location}
                onChange={(event) => chooseLocation(event.target.value)}
                className="mt-2 w-full cursor-pointer appearance-none border border-ink/15 bg-bone px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-ink"
              >
                {LOCATIONS.map((item) => (
                  <option key={item} value={item} className="text-ink">
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* --------------------------------------------------- auth actions */}
          <div className="border-t border-sand px-5 py-5">
            {customer ? (
              <button
                type="button"
                onClick={signOut}
                disabled={busy}
                className={`w-full border border-ink/20 py-3 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:border-ink ${
                  busy ? "cursor-wait opacity-60" : ""
                }`}
              >
                {busy ? "Signing out" : "Sign out"}
              </button>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/account/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 bg-ink py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/account/login?mode=signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-ink/20 py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-ink transition-colors hover:border-ink"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
