"use client";

import { useEffect, useState } from "react";

import { readConsent, saveConsent, type ConsentChoice } from "./cookie-consent";

/** Reopens the consent bar from the footer, showing what was chosen before. */
export function CookiePreferencesLink() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);

  /* Reads the stored choice after the frame paints, keeping the first client
     render identical to the server output. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChoice(readConsent()));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const previous = readConsent();
        /* Clearing the stored choice makes the bar reappear with the
           previous selection intact, ready to be changed. */
        try {
          window.localStorage.removeItem("nova.consent");
        } catch {
          /* ignore */
        }
        if (previous) {
          saveConsent({ analytics: previous.analytics, marketing: previous.marketing });
        }
        window.dispatchEvent(new CustomEvent("nova:open-consent"));
      }}
      className="link-underline text-left transition-colors hover:text-ivory"
    >
      Cookie preferences{choice ? " ✓" : ""}
    </button>
  );
}
