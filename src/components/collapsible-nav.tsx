"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavSection = {
  title?: string;
  items: { href: string; label: string }[];
};

/**
 * Section navigation that folds away on small screens — one toggle instead of
 * a wall of wrapped links — and stays a plain column in the desktop sidebar.
 * The link you are on is faded in, and works with the keyboard and Esc.
 */
export function CollapsibleNav({
  sections,
  label = "Menu",
  variant = "admin",
}: {
  sections: NavSection[];
  label?: string;
  variant?: "admin" | "account";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const rootHref = variant === "admin" ? "/admin" : "/account";
  const isActive = (href: string) =>
    href === rootHref ? pathname === href : pathname.startsWith(href);

  const linkClass = (active: boolean) =>
    variant === "admin"
      ? `flex items-center justify-between gap-2 border-bone-dark px-3 py-2.5 text-[13px] transition-colors lg:border-b lg:border-sand lg:px-0 ${
          active ? "bg-bone-dark font-medium text-brass" : "text-ink-500 hover:bg-bone-dark hover:text-ink"
        }`
      : `flex items-center justify-between gap-2 border-bone-dark px-3 py-2.5 text-[13px] transition-colors lg:border-b lg:border-sand ${
          active ? "font-medium text-ink" : "text-ink-500 hover:text-ink"
        }`;

  return (
    <div className="mt-8 border-t border-sand pt-6 lg:mt-9">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border border-ink/15 bg-bone px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink lg:hidden"
      >
        {open ? `Close ${label.toLowerCase()}` : label}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <nav className={`${open ? "block" : "hidden"} mt-3 lg:mt-0 lg:block`}>
        {sections.map((section, sectionIndex) => (
          <div key={section.title ?? `section-${sectionIndex}`}>
            {section.title && (
              <p
                className={`eyebrow text-ink-300 ${
                  sectionIndex === 0 ? "lg:pt-0" : ""
                } mt-5 lg:mt-6 lg:pt-4`}
              >
                {section.title}
              </p>
            )}

            <div className="flex flex-col">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={linkClass(active)}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`h-1 w-1 rounded-full ${active ? "bg-brass" : "bg-transparent"}`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
