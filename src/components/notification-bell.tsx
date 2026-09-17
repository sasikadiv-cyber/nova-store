"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  kind: "order" | "review" | "message" | "delivery";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
  actionable: boolean;
};

const SEEN_KEY = "nova.notifications.readAt";

/** The moment the user last acknowledged the feed, as epoch ms. */
function readLastSeen() {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(iso: string | null) {
  try {
    window.localStorage.setItem(
      SEEN_KEY,
      String(iso ? new Date(iso).getTime() : Date.now()),
    );
  } catch {
    /* Private mode — the badge simply stays live. */
  }
}

/** Anything created after the last acknowledgement is genuinely new. */
function countUnseen(items: Item[], lastSeen: number) {
  return items.filter((item) => new Date(item.createdAt).getTime() > lastSeen).length;
}

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  order: {
    label: "Order",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M6 2h12l1 5H5l1-5zM5 7h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" />
      </svg>
    ),
  },
  review: {
    label: "Review",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
      </svg>
    ),
  },
  message: {
    label: "Message",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 5h16v11H8l-4 4V5z" />
      </svg>
    ),
  },
  delivery: {
    label: "Delivery",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
};

const KINDS = ["all", "order", "review", "message", "delivery"] as const;
const RANGES = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Activity, on the right.
 *
 * The floating bell is the quick entry point; the same feed is embedded as a
 * full Notifications section on the page, so it can be read properly rather
 * than only in a small popover.
 */
export function NotificationFeed({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState<string>("all");
  const [days, setDays] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?kind=${kind}&days=${days}`);
      const payload = (await response.json()) as {
        notifications?: Item[];
        newestAt?: string | null;
      };
      setItems(payload.notifications ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kind, days]);

  useEffect(() => {
    setLastSeen(readLastSeen());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unread = countUnseen(items, lastSeen);

  /* Reading the full feed is the acknowledgement — mark everything shown as
     seen so the badge reflects what is actually new next time. */
  function markAllRead() {
    const newest = items[0]?.createdAt ?? null;
    writeLastSeen(newest);
    setLastSeen(newest ? new Date(newest).getTime() : Date.now());
  }

  return (
    <div>
      {/* ---------------------------------------------------------- filters */}
      <div className="flex flex-wrap items-center gap-4 border-b border-sand pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {KINDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                kind === value
                  ? "border-ink bg-ink text-bone"
                  : "border-ink/15 text-ink-400 hover:border-ink/45 hover:text-ink"
              }`}
            >
              {value === "all" ? "All" : KIND_META[value]?.label ?? value}
            </button>
          ))}
        </div>

        <span className="ml-auto flex items-center gap-1.5">
          {RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => setDays(range.value)}
              className={`border px-2.5 py-1.5 text-[11px] transition-colors ${
                days === range.value
                  ? "border-brass bg-brass/15 text-ink"
                  : "border-ink/15 text-ink-400 hover:border-brass/60"
              }`}
            >
              {range.label}
            </button>
          ))}
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="border border-brass/50 bg-brass/10 px-2.5 py-1.5 text-[11px] text-brass transition-colors hover:border-brass"
            >
              Mark {unread} read
            </button>
          )}
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="grid h-[30px] w-[30px] place-items-center border border-ink/15 text-ink-400 transition-colors hover:border-ink hover:text-ink"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              className={loading ? "animate-spin" : ""}
            >
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
            </svg>
          </button>
        </span>
      </div>

      {/* -------------------------------------------------------- the feed */}
      <div className={compact ? "" : "divide-y divide-sand"}>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink/40 border-t-transparent" />
            <span className="text-[13px] text-ink-300">Loading activity…</span>
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-300">
            Nothing in this period.
          </p>
        ) : (
          items.map((item) => {
            const meta = KIND_META[item.kind] ?? KIND_META.order;
            const isNew = new Date(item.createdAt).getTime() > lastSeen;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start gap-3.5 px-1 py-4 transition-colors hover:bg-bone"
              >
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    isNew || item.actionable
                      ? "bg-brass/18 text-brass"
                      : "bg-bone-dark text-ink-300"
                  }`}
                >
                  {meta.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium">{item.title}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-300">
                      {relative(item.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-300">
                    {item.detail}
                  </span>
                  {item.actionable && (
                    <span className="mt-1.5 inline-block bg-brass/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brass">
                      Needs attention
                    </span>
                  )}
                </span>

                {isNew && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Floating quick-access bell, pinned to the bottom-right. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/notifications?kind=all&days=30");
        const payload = (await response.json()) as { notifications?: Item[] };
        if (!active) return;
        /* Badge counts what has arrived since the feed was last read, so it
           empties when the owner actually reads it — not on every reload. */
        setCount(countUnseen(payload.notifications ?? [], readLastSeen()));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen((value) => {
            /* Opening the popover is reading it. */
            if (!value) {
              writeLastSeen(null);
              setCount(0);
            }
            return !value;
          })
        }
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[180] grid h-12 w-12 place-items-center rounded-full border border-sand bg-linen text-ink shadow-lift transition-transform hover:scale-105"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
          <path d="M10.3 18a2 2 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[20px] place-items-center rounded-full bg-ember px-1 text-[10px] font-bold text-bone">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-[86px] right-5 z-[180] max-h-[68vh] w-[min(390px,calc(100vw-2.5rem))] overflow-hidden border border-sand bg-linen text-ink shadow-lift">
          <div className="flex items-baseline justify-between border-b border-sand px-4 py-3">
            <p className="eyebrow text-ink-300">Recent activity</p>
            <Link
              href="#notifications"
              onClick={() => setOpen(false)}
              className="link-underline text-[11px] uppercase tracking-[0.14em] text-ink-300"
            >
              View all
            </Link>
          </div>
          <div className="max-h-[52vh] overflow-y-auto px-3">
            <NotificationFeed compact />
          </div>
        </div>
      )}
    </>
  );
}
