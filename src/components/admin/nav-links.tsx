"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sidebar links that fade the section you are currently in. */
export function AdminNavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`border-bone-dark px-3 py-2.5 text-[13px] transition-colors lg:border-b lg:border-sand lg:px-0 ${
              active
                ? "bg-bone-dark font-medium text-brass"
                : "text-ink-500 hover:bg-bone-dark hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
