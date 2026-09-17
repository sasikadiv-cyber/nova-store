"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nova.consent";
const COOKIE_NAME = "nova_consent";
const ONE_YEAR = 365 * 24 * 60 * 60;

export type ConsentChoice = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

function writeCookie(value: string) {
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    /* cookies blocked — localStorage still remembers the choice */
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      decidedAt: parsed.decidedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveConsent(choice: Omit<ConsentChoice, "decidedAt" | "necessary">) {
  const full: ConsentChoice = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* ignore */
  }
  writeCookie(JSON.stringify(full));
  return full;
}

/**
 * The consent bar shown at the foot of the viewport on a first visit. Nothing
 * is set until the visitor chooses — accept everything, refuse everything, or
 * pick categories. Reopened any time from the footer link.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  /* Greets the visitor once per browser session — a reload does not repeat
     it, but closing the tab and returning does. Their last choice pre-ticks
     the boxes, and the footer link reopens it any time. */
  useEffect(() => {
    /* Greeting opens on the next frame: the first client render matches the
       server (bar hidden) and the reveal still animates in smoothly. */
    const frame = requestAnimationFrame(() => {
      try {
        if (window.sessionStorage.getItem("nova.consent.shown") === "1") return;
        window.sessionStorage.setItem("nova.consent.shown", "1");
      } catch {
        /* storage unavailable — still show the bar */
      }

      const previous = readConsent();
      setAnalytics(previous?.analytics ?? false);
      setMarketing(previous?.marketing ?? false);
      setCustomize(false);
      setOpen(true);
    });

    const reopen = () => {
      setCustomize(false);
      setOpen(true);
    };
    window.addEventListener("nova:open-consent", reopen);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("nova:open-consent", reopen);
    };
  }, []);

  if (!open) return null;

  function decide(choice: { analytics: boolean; marketing: boolean }) {
    saveConsent(choice);
    setOpen(false);
    /* Lets the welcome card know it may appear now. */
    window.dispatchEvent(new CustomEvent("nova:consent-decided"));
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[190] border-t border-ink/10 bg-linen/98 backdrop-blur"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                className="text-brass"
              >
                <path d="M21 12a9 9 0 1 1-9-9 4 4 0 0 0 4 4 3.5 3.5 0 0 0 3.5 3.5A3 3 0 0 0 21 12z" />
                <circle cx="9.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="13" cy="15" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="8.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
              </svg>
              <p className="eyebrow text-brass">Cookies &amp; your privacy</p>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">
              We use one strictly necessary cookie to keep your session and bag working. With your
              permission we would also like to measure how the store is used (analytics) and
              remember the campaigns that brought you here (marketing). Nothing is set until you
              choose.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => decide({ analytics: true, marketing: true })}
              className="bg-ink px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => decide({ analytics: false, marketing: false })}
              className="border border-ink/25 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors hover:border-ink"
            >
              Deny all
            </button>
            <button
              type="button"
              onClick={() => setCustomize((value) => !value)}
              className="link-underline py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-300"
            >
              {customize ? "Hide options" : "Customize"}
            </button>
          </div>
        </div>

        {customize && (
          <div className="mt-6 border-t border-sand pt-6">
            <div className="grid gap-5 md:grid-cols-3">
              <label className="flex cursor-not-allowed items-start gap-3 opacity-70">
                <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-ink" />
                <span>
                  <span className="block text-[13.5px]">Strictly necessary</span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-300">
                    Session, bag and theme. Always on — the store cannot work without them.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-ink"
                />
                <span>
                  <span className="block text-[13.5px]">Analytics</span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-300">
                    Anonymous, aggregated measurement of which pages are read.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-ink"
                />
                <span>
                  <span className="block text-[13.5px]">Marketing</span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-300">
                    Remembering the campaigns and promo codes that brought you here.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => decide({ analytics, marketing })}
                className="bg-ink px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-bone transition-colors hover:bg-ink-700"
              >
                Save my choices
              </button>
              <Link href="/privacy" className="link-underline text-[11.5px] text-ink-300">
                Read the privacy policy
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
