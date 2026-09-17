"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

import { useStore } from "./store-provider";

export function Price({
  cents,
  className = "",
}: {
  cents: number;
  className?: string;
}) {
  const { price } = useStore();
  return <span className={className}>{price(cents)}</span>;
}

export function Stars({
  rating,
  className = "",
  size = 12,
}: {
  rating: number;
  className?: string;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - (index - 1)));
        return (
          <svg
            key={index}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="shrink-0"
          >
            <defs>
              <linearGradient id={`star-${index}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.47 5.2 5.68.72-4.16 3.94 1.06 5.63L10 14.4l-5.05 2.69 1.06-5.63L1.85 7.52l5.68-.72L10 1.6z"
              fill={`url(#star-${index}-${Math.round(fill * 100)})`}
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        );
      })}
    </span>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      /* Ancient browser: reveal on the next frame instead of a sync update. */
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-visible={visible ? "true" : "false"}
      className={`reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const doubled = [...items, ...items];
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee items-center">
        {doubled.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center whitespace-nowrap">
            <span className="px-6">{item}</span>
            <span className="h-1 w-1 rounded-full bg-current opacity-40" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}
