import Link from "next/link";
import { notFound } from "next/navigation";

import { PageForm } from "@/components/admin/page-form";
import { ensureSitePagesSeeded, getSitePages } from "@/lib/site-pages";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function EditSitePage({ params }: Params) {
  const { slug } = await params;
  await ensureSitePagesSeeded();

  const page = (await getSitePages()).find((entry) => entry.slug === slug);
  if (!page) notFound();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6">
        <div>
          <p className="eyebrow text-sage">Site pages</p>
          <h1 className="mt-2 text-3xl">{page.title}</h1>
          <p className="mt-3 text-[13px] text-ink-300">
            Live at <span className="text-ink">/{page.slug}</span>
          </p>
        </div>
        <Link
          href="/admin/pages"
          className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
        >
          All pages
        </Link>
      </header>

      <PageForm
        slug={page.slug}
        title={page.title}
        eyebrow={page.eyebrow}
        intro={page.intro}
        blocks={page.blocks}
        published={page.published}
      />
    </div>
  );
}
