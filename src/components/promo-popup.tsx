"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SESSION_KEY = "nova.popup.greeted";

export type PromoPopupContent = {
  eyebrow: string;
  title: string;
  body: string;
  code: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  delay: string;
};

/**
 * The welcome card, shown once per browser session and only on the home page.
 *
 * The marker lives in session storage, so a reload does not repeat the
 * greeting but closing the tab and returning does. It also waits for the
 * visitor's cookie choice rather than stacking on top of the banner.
 */
export function PromoPopup({ content }: { content: PromoPopupContent }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function close() {
    /* The session marker already covers this visit, so nothing to store. */
    setOpen(false);
  }

  const pathname = usePathname();

  useEffect(() => {
    let timer: number | undefined;
    let onConsent: (() => void) | null = null;

    /* Greeting belongs to the home page only. */
    if (pathname !== "/") {
      setOpen(false);
      return;
    }

    /* Once per browser session — a reload must not repeat it, but a fresh
       visit after closing the tab should be greeted again. */
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* storage unavailable — still greet */
    }

    const seconds = Math.max(0, Number(content.delay) || 0);
    const arm = () => {
      timer = window.setTimeout(() => setOpen(true), seconds * 1000);
    };

    /* Never stack the card on the cookie bar: if the bar is going to appear
       this session, the choice comes first and the greeting follows it. */
    let bannerWillShow = false;
    try {
      bannerWillShow = window.sessionStorage.getItem("nova.consent.shown") !== "1";
    } catch {
      bannerWillShow = false;
    }

    if (bannerWillShow) {
      onConsent = arm;
      window.addEventListener("nova:consent-decided", onConsent);
    } else {
      arm();
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (onConsent) window.removeEventListener("nova:consent-decided", onConsent);
    };
  }, [content.delay, pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);


  async function copyCode() {
    try {
      await navigator.clipboard.writeText(content.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6">
      <div
        onClick={close}
        className="animate-overlay-in absolute inset-0 bg-ink/60 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        className="animate-modal-in relative z-10 flex max-h-[88svh] w-full max-w-[520px] flex-col overflow-hidden bg-bone shadow-lift sm:max-h-[86svh] sm:max-w-[880px] sm:flex-row"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-bone/85 text-ink backdrop-blur transition-colors hover:bg-ink hover:text-bone"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        {/* ------------------------------------------------------- image */}
        <div className="relative h-[190px] shrink-0 overflow-hidden bg-bone-dark sm:h-auto sm:w-[42%]">
          {content.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={content.image}
              alt={content.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/35 to-transparent sm:bg-gradient-to-r" />
        </div>

        {/* ------------------------------------------------------- copy */}
        <div className="hide-scrollbar flex flex-1 flex-col justify-center gap-4 overflow-y-auto p-7 md:p-10">
          <p className="eyebrow text-brass">{content.eyebrow}</p>
          <h2 className="text-[clamp(1.8rem,4vw,2.7rem)] leading-[1.04]">{content.title}</h2>
          <p className="max-w-md text-[14px] leading-relaxed text-ink-500">{content.body}</p>

          {content.code && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyCode}
                className="border border-dashed border-brass bg-brass/10 px-4 py-2.5 font-mono text-[14px] tracking-[0.16em] text-ink transition-colors hover:bg-brass/20"
              >
                {content.code}
              </button>
              <span className="text-[11px] uppercase tracking-[0.14em] text-ink-300">
                {copied ? "Copied ✓" : "Tap to copy"}
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {content.ctaLabel && (
              <Link
                href={content.ctaHref || "/shop"}
                onClick={close}
                className="group relative overflow-hidden bg-ink px-9 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone"
              >
                <span className="relative z-10 transition-colors duration-500 group-hover:text-ivory">
                  {content.ctaLabel}
                </span>
                <span className="absolute inset-0 -translate-y-full bg-char transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
              </Link>
            )}
            <button
              type="button"
              onClick={close}
              className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
            >
              No thanks
            </button>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
            Join the list any time from the footer.
          </p>
        </div>
      </div>
    </div>
  );
}
