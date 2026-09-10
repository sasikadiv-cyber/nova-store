"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(response.ok ? "done" : "error");
      if (response.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-3 border border-ivory/20 px-5 py-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        <p className="text-[13.5px]">
          Welcome to Nova. Your 10% welcome code is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex items-center gap-3 border-b border-ivory/25 pb-3 transition-colors focus-within:border-ivory/60">
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Email address"
          aria-label="Email address"
          className="w-full bg-transparent text-[14px] text-ivory outline-none placeholder:text-ivory/45"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-ivory transition-opacity hover:opacity-60 disabled:opacity-40"
        >
          {status === "loading" ? "Sending" : "Join"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-[12px] text-brass-light">
          Please enter a valid email address.
        </p>
      )}
    </form>
  );
}
