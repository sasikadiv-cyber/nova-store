import Image from "next/image";
import Link from "next/link";

import { CountUp } from "@/components/count-up";
import { ProductCard } from "@/components/product-card";
import { Price, Reveal, Stars } from "@/components/ui";
import { px } from "@/lib/seed-data";
import { getAppearance } from "@/lib/site-settings";
import {
  getBestSellers,
  getCollections,
  getFeatured,
  getNewArrivals,
  getStorefrontStats,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/* Hero and editorial media come from Site appearance (admin → appearance),
   so the owner can swap films and copy without touching the code. */
const ATELIER_IMAGE_FALLBACK = px(14641430, { w: 1000, h: 1250 });

const PROMISES = [
  {
    title: "Delivered to 94 countries",
    body: "DHL and UPS express from our Rotterdam and Singapore hubs, duties and taxes included at checkout.",
  },
  {
    title: "Small-run manufacturing",
    body: "Between 150 and 600 units per colourway, made with mills we visit three times a year.",
  },
  {
    title: "30-day global returns",
    body: "A prepaid label in every parcel. Refunds land within three working days of arrival.",
  },
  {
    title: "Repaired, not replaced",
    body: "Free stitching and resoling on all footwear for the life of the shoe.",
  },
];

export default async function HomePage() {
  const [collections, featured, newArrivals, bestSellers, stats, appearance] = await Promise.all([
    getCollections(),
    getFeatured(8),
    getNewArrivals(4),
    getBestSellers(4),
    getStorefrontStats(),
    getAppearance(),
  ]);

  const heroProduct = featured[0];
  const editorial = collections.slice(0, 3);

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative -mt-[68px] flex min-h-[92svh] items-end overflow-hidden bg-band pt-[68px] md:-mt-[76px] md:pt-[76px]">
        <div className="absolute inset-0">
          <video
            className="animate-fade-in h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={appearance.hero_poster}
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={appearance.hero_video} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-band/92 via-band/45 to-band/60" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1600px] px-5 pb-16 pt-20 text-ivory md:px-10 md:pb-24">
          <div className="max-w-3xl">
            <p className="eyebrow animate-fade-up text-ivory/70">{appearance.hero_eyebrow}</p>
            <h1
              className="display-xl mt-5 animate-fade-up text-[clamp(2.9rem,7.6vw,7rem)]"
              style={{ animationDelay: "120ms" }}
            >
              {appearance.hero_heading_line1}
              <br />
              <span className="italic text-brass-light">{appearance.hero_heading_line2}</span>
            </h1>
            <p
              className="mt-6 max-w-lg animate-fade-up text-[14.5px] leading-relaxed text-ivory/75 md:text-base"
              style={{ animationDelay: "240ms" }}
            >
              {appearance.hero_body}
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-wrap items-center gap-x-7 gap-y-4"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                href={appearance.hero_cta_href}
                className="group relative overflow-hidden bg-ivory px-8 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-char sm:px-10"
              >
                <span className="relative z-10 transition-colors duration-500 group-hover:text-ivory">
                  {appearance.hero_cta_label}
                </span>
                <span className="absolute inset-0 -translate-y-full bg-char transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
              </Link>
              <Link
                href={appearance.hero_secondary_href}
                className="link-underline py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory"
              >
                {appearance.hero_secondary_label}
              </Link>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-8 border-t border-ivory/15 pt-7 lg:flex-row lg:items-end lg:justify-between">
            <dl className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-6 gap-y-7 min-[360px]:gap-x-8 sm:grid-cols-4 lg:gap-x-12">
              {[
                { value: 94, decimals: 0, label: "Countries served" },
                { value: stats.products, decimals: 0, label: "Pieces in season" },
                { value: stats.avgRating, decimals: 1, label: "Average rating" },
                { value: 30, decimals: 0, label: "Day returns" },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="animate-fade-up"
                  style={{ animationDelay: `${420 + index * 90}ms` }}
                >
                  <dt className="font-display text-[clamp(1.75rem,8vw,2.25rem)] leading-none md:text-4xl">
                    <CountUp value={item.value} decimals={item.decimals} />
                  </dt>
                  <dd className="eyebrow mt-2.5 text-[9.5px] text-ivory/55">{item.label}</dd>
                </div>
              ))}
            </dl>

            {heroProduct && (
              <Link
                href={`/products/${heroProduct.slug}`}
                className="group hidden animate-fade-up items-center gap-4 border border-ivory/20 p-3 pr-6 backdrop-blur-sm transition-colors hover:border-ivory/50 lg:flex"
                style={{ animationDelay: "520ms" }}
              >
                <div className="relative h-[92px] w-[70px] overflow-hidden">
                  <Image
                    src={heroProduct.images[0]}
                    alt={heroProduct.name}
                    fill
                    sizes="70px"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div>
                  <p className="eyebrow text-ivory/50">As seen on the runway</p>
                  <p className="mt-2 text-[15px]">{heroProduct.name}</p>
                  <p className="mt-1 text-[13px] text-ivory/60">
                    <Price cents={heroProduct.priceCents} />
                  </p>
                </div>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  className="ml-2 shrink-0 transition-transform duration-500 group-hover:translate-x-1"
                >
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- seasonal offer */}
      {/* Kept clear of the hero with the same rhythm as the section that
           follows it, so the card breathes instead of butting straight
           against the hero's bottom edge. */}
      {appearance.promo_enabled === "true" && (
        <section className="mt-20 border-y border-sand bg-linen md:mt-28">
          <div className="mx-auto grid w-full max-w-[1600px] items-stretch gap-0 px-5 md:px-10 lg:grid-cols-2">
            <div className="relative min-h-[240px] overflow-hidden bg-bone-dark lg:min-h-[420px]">
              {appearance.promo_image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={appearance.promo_image}
                  alt={appearance.promo_title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
            </div>

            <div className="flex flex-col justify-center gap-5 p-7 md:p-14">
              <p className="eyebrow text-brass">{appearance.promo_eyebrow}</p>
              <h2 className="text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.05]">
                {appearance.promo_title}
              </h2>
              <p className="max-w-lg text-[14.5px] leading-relaxed text-ink-500">
                {appearance.promo_body}
              </p>

              {appearance.promo_code && (
                <div className="flex items-center gap-3">
                  <span className="border border-dashed border-brass bg-brass/10 px-4 py-2.5 font-mono text-[14px] tracking-[0.16em] text-ink">
                    {appearance.promo_code}
                  </span>
                  <span className="text-[11.5px] uppercase tracking-[0.14em] text-ink-300">
                    Apply at checkout
                  </span>
                </div>
              )}

              {appearance.promo_cta_label && (
                <Link
                  href={appearance.promo_cta_href || "/shop"}
                  className="mt-2 inline-flex w-fit items-center gap-3 bg-ink px-9 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
                >
                  {appearance.promo_cta_label}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M4 12h15M13 6l6 6-6 6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------- featured collections */}
      <section className="mx-auto w-full max-w-[1600px] px-5 py-20 md:px-10 md:py-28">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-sage">{appearance.features_eyebrow}</p>
            <h2 className="mt-4 text-[clamp(2rem,4.4vw,3.8rem)]">
              {appearance.features_heading}
            </h2>
          </div>
          <Link
            href="/shop"
            className="link-underline shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-500"
          >
            View all collections
          </Link>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {editorial.map((collection, index) => (
            <Reveal
              key={collection.slug}
              delay={index * 120}
              className={index === 0 ? "lg:row-span-2" : ""}
            >
              <Link
                href={`/shop?collection=${collection.slug}`}
                className="group relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden bg-band lg:min-h-[420px]"
              >
                <Image
                  src={collection.image}
                  alt={collection.name}
                  fill
                  sizes={
                    index === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 25vw"
                  }
                  className="object-cover opacity-90 transition-all duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-band/85 via-band/15 to-transparent" />
                <div className="relative p-6 text-ivory md:p-7">
                  <p className="eyebrow text-ivory/60">{collection.tagline}</p>
                  <h3
                    className={`mt-3 leading-tight ${
                      index === 0 ? "text-[clamp(1.9rem,3.4vw,3.1rem)]" : "text-[26px] md:text-3xl"
                    }`}
                  >
                    {collection.name}
                  </h3>
                  <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-ivory/70">
                    {collection.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em]">
                    Explore
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      className="shrink-0 transition-transform duration-500 group-hover:translate-x-1.5"
                    >
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- new arrivals */}
      <section className="border-y border-sand bg-linen py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1600px] px-5 md:px-10">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-sage">{appearance.new_in_eyebrow}</p>
              <h2 className="mt-4 text-[clamp(2rem,4.4vw,3.8rem)]">{appearance.new_in_heading}</h2>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-300">
                {appearance.new_in_body}
              </p>
            </div>
            <Link
              href="/shop?sort=newest"
              className="link-underline shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-500"
            >
              Shop all new in
            </Link>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-5 lg:gap-x-6">
            {newArrivals.map((product, index) => (
              <Reveal key={product.id} delay={index * 100}>
                <ProductCard product={product} priority={index < 2} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- editorial */}
      <section className="bg-bone-dark py-20 md:py-28">
        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-12 px-5 md:px-10 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative pb-14 md:pb-16">
            <div className="relative aspect-4/5 w-full overflow-hidden bg-bone-dark">
              <video
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={appearance.atelier_poster}
                disablePictureInPicture
                aria-hidden="true"
                tabIndex={-1}
              >
                <source src={appearance.atelier_video} type="video/mp4" />
              </video>
            </div>
            <div className="absolute bottom-0 right-0 w-[42%] overflow-hidden border-[10px] border-bone-dark shadow-lift">
              <div className="relative aspect-3/4">
                <Image
                  src={appearance.editorial_image}
                  alt="Detail of the knit used across the Essentials collection"
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <p className="eyebrow text-sage">{appearance.method_eyebrow}</p>
            <h2 className="mt-4 text-[clamp(2rem,4.2vw,3.6rem)]">
              {appearance.method_heading}
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-ink-500">
              {appearance.method_body}
            </p>

            <div className="mt-10 grid gap-px overflow-hidden border border-sand bg-sand sm:grid-cols-2">
              {[
                { label: "Mills & ateliers", value: "12" },
                { label: "Units per colourway", value: "150–600" },
                { label: "Traceable fibres", value: "94%" },
                { label: "Air freight, avoided", value: "100%" },
              ].map((item) => (
                <div key={item.label} className="bg-linen p-6">
                  <p className="font-display text-3xl leading-none">{item.value}</p>
                  <p className="eyebrow mt-3 text-[9.5px] text-ink-300">{item.label}</p>
                </div>
              ))}
            </div>

            <Link
              href="/shop?collection=elevated-essentials"
              className="mt-10 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-ink"
            >
              <span className="link-underline">Shop Elevated Essentials</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- best sellers */}
      <section className="mx-auto w-full max-w-[1600px] px-5 py-20 md:px-10 md:py-28">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-sage">{appearance.best_eyebrow}</p>
            <h2 className="mt-4 text-[clamp(2rem,4.4vw,3.8rem)]">
              {appearance.best_heading}
            </h2>
          </div>
          <Link
            href="/shop?sort=best-selling"
            className="link-underline shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-500"
          >
            Shop best sellers
          </Link>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-5 lg:gap-x-6">
          {bestSellers.map((product, index) => (
            <Reveal key={product.id} delay={index * 100}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- promises */}
      <section className="bg-band py-20 text-ivory md:py-28">
        <div className="mx-auto w-full max-w-[1600px] px-5 md:px-10">
          <Reveal className="max-w-2xl">
            <p className="eyebrow text-ivory/45">{appearance.service_eyebrow}</p>
            <h2 className="mt-4 text-[clamp(2rem,4.2vw,3.4rem)]">
              {appearance.service_heading}
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px bg-ivory/12 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((promise, index) => (
              <Reveal key={promise.title} delay={index * 110} className="bg-band p-7 md:p-8">
                <p className="font-display text-[22px] leading-snug md:text-2xl">{promise.title}</p>
                <p className="mt-4 text-[13px] leading-relaxed text-ivory/60">{promise.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ testimonials */}
      <section className="bg-sand py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1600px] px-5 md:px-10">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-sage">{appearance.notes_eyebrow}</p>
            <h2 className="mt-4 text-[clamp(2rem,4.2vw,3.4rem)]">
              {stats.avgRating.toFixed(1)} average from {stats.reviews} verified reviews
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                quote:
                  "The Aurora coat is the first piece I've owned that feels genuinely worth its price. Shipped to Copenhagen in three days with duties already paid.",
                author: "Maren K.",
                place: "Copenhagen, DK",
                product: "Aurora Double-Faced Wool Coat",
              },
              {
                quote:
                  "I've had the Court sneakers resoled once already, free of charge, two years in. That's the whole reason I keep coming back.",
                author: "Wei C.",
                place: "Taipei, TW",
                product: "Nova Court Leather Sneaker",
              },
              {
                quote:
                  "Ordered the cashmere crew in Tokyo, returned one size from Singapore, and the refund landed before the parcel arrived back. Flawless.",
                author: "Yuki T.",
                place: "Tokyo, JP",
                product: "Cloudsoft Cashmere Crew",
              },
            ].map((testimonial, index) => (
              <Reveal key={testimonial.author} delay={index * 120}>
                <figure className="flex h-full flex-col bg-linen p-7 md:p-8">
                  <Stars rating={5} className="text-brass" size={14} />
                  <blockquote className="mt-5 flex-1 font-display text-[20px] leading-[1.4] md:text-[22px]">
                    “{testimonial.quote}”
                  </blockquote>
                  <figcaption className="mt-7 border-t border-ink/10 pt-5 text-[12.5px]">
                    <span className="font-medium">{testimonial.author}</span>
                    <span className="text-ink-300"> · {testimonial.place}</span>
                    <span className="mt-1 block text-[11.5px] text-ink-300">
                      Purchased the {testimonial.product}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- band */}
      <section className="bg-sage-tint py-20 md:py-24">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center px-5 text-center md:px-10">
          <Reveal className="flex flex-col items-center">
            <p className="eyebrow text-sage">{appearance.join_eyebrow}</p>
            <h2 className="mt-5 text-[clamp(2.2rem,5.4vw,4.6rem)]">{appearance.join_heading}</h2>
            <p className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-ink-500">
              {appearance.join_body}
            </p>
            <Link
              href="/shop"
              className="mt-9 bg-ink px-10 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-espresso"
            >
              Start shopping
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
