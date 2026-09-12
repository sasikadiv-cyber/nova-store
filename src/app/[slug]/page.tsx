import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/contact-form";
import { ensureSitePagesSeeded, getSitePage } from "@/lib/site-pages";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSitePage(slug);
  return { title: page ? `${page.title} — Nova` : "Not found" };
}

/**
 * Renders every informational page the owner can edit from the console —
 * privacy, terms, help, contact, shipping, returns and the rest. Unknown
 * slugs fall through to the 404 page.
 */
export default async function InfoPage({ params }: Params) {
  const { slug } = await params;
  await ensureSitePagesSeeded();
  const page = await getSitePage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-[780px]">
        <p className="eyebrow text-brass">{page.eyebrow}</p>
        <h1 className="mt-5 text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05]">{page.title}</h1>
        {page.intro && (
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-500">{page.intro}</p>
        )}

        <div className="mt-14 space-y-12">
          {page.blocks.map((block, index) => (
            <section key={`${block.heading}-${index}`} className="border-t border-sand pt-8">
              <h2 className="text-[21px] leading-snug">{block.heading}</h2>
              <div className="mt-4 space-y-4">
                {block.body.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className="text-[14.5px] leading-[1.75] text-ink-500"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {slug === "contact" && (
          <div className="mt-16 border-t border-sand pt-12">
            <h2 className="text-[21px]">Write to us</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-300">
              A client adviser replies within one working day.
            </p>
            <ContactForm />
          </div>
        )}

        <div className="mt-20 border-t border-sand pt-7">
          <Link
            href="/shop"
            className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </article>
  );
}
