"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up when it scrolls into view, easing out so it settles
 * gently. Used for the storefront statistics.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 1400,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const nodeRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    /* Respect visitors who prefer no motion — land on the value at once. */
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;

        if (reduce) {
          setDisplay(value);
          return;
        }

        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(value * eased);
          if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={nodeRef} className={className}>
      {display.toFixed(decimals)}
    </span>
  );
}
