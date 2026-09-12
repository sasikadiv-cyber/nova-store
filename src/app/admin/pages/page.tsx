import Link from "next/link";

import { togglePagePublishedAction } from "../actions";
import { ensureSitePagesSeeded, getSitePages } from "@/lib/site-pages";

export const dynamic = "force-dynamic";

export default async function AdminPages() {
  await ensureSitePagesSeeded();
  const pages = await getSitePages();
  const live = pages.filter((page) => page.published).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6">
        <div>
          <p className="eyebrow text-sage">Site pages</p>
          <h1 className="mt-2 text-3xl">Informational pages</h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
            Every page behind the footer links — privacy, terms, help, contact, shipping and the
            rest. Rewrite the copy here and the storefront updates instantly.
          </p>
        </div>
        <p className="text-[13px] text-ink-300">
          <span className="text-ink">{live}</span> live · {pages.length} total
        </p>
      </header>

      <div className="border border-sand bg-linen">
        {pages.map((page) => (
          <div
            key={page.slug}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-sand px-5 py-4 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-[14.5px]">
                {page.title}
                <span
                  className={`ml-3 inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    page.published ? "bg-sage-tint text-sage" : "bg-bone-dark text-ink-300"
                  }`}
                >
                  {page.published ? "Live" : "Hidden"}
                </span>
              </p>
              <p className="mt-1 text-[12px] text-ink-300">
                /{page.slug} · {page.blocks.length} sections ·{" "}
                {new Date(page.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/${page.slug}`}
                className="border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
              >
                View
              </Link>
              <Link
                href={`/admin/pages/${page.slug}`}
                className="bg-ink px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ink-700"
              >
                Edit
              </Link>
              <form action={togglePagePublishedAction}>
                <input type="hidden" name="slug" value={page.slug} />
                <button
                  type="submit"
                  className="border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
                >
                  {page.published ? "Hide" : "Publish"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
