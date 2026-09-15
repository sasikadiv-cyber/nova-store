import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import { ProductGallery, PurchasePanel, ReviewsSection } from "@/components/product-detail";
import { Reveal } from "@/components/ui";
import { safeJsonLd } from "@/lib/security";
import { getCompleteLook, getProductBySlug, getProductReviews, getRelatedProducts } from "@/lib/queries";
import { ensureVariants, getVariants, toStockView } from "@/lib/variants";

/* Rendered once per product and cached at the edge; console saves call
   revalidatePath so a price change appears straight away. */
export const revalidate = 60;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Piece not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: {
      title: `${product.name} · Nova`,
      description: product.subtitle,
      images: [{ url: product.images[0] }],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  /* Owner-uploaded story images, falling back to gallery images 3 and 4. */
  const storyImages = product.storyImages?.length
    ? product.storyImages
    : product.images.slice(2, 4);
  const storyLabels = product.storyImages?.length
    ? (product.storyImageLabels ?? [])
    : [];

  /* Colour-and-size level availability, created on first read if needed. */
  await ensureVariants(product.id);
  const variantStock = toStockView(await getVariants(product.id));

  const [reviews, look, related] = await Promise.all([
    getProductReviews(product.id),
    getCompleteLook(product.completeLook),
    getRelatedProducts(product, 4),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    brand: { "@type": "Brand", name: "Nova" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: Math.max(1, product.reviewCount),
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (product.priceCents / 100).toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 md:py-10">
        <nav className="eyebrow flex flex-wrap items-center gap-2 text-ink-300">
          <Link href="/" className="link-underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="link-underline">
            Shop
          </Link>
          <span>/</span>
          <Link href={`/shop?categories=${encodeURIComponent(product.category)}`} className="link-underline">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-ink-500">{product.name}</span>
        </nav>

        <div className="mt-6 grid min-w-0 gap-10 min-[360px]:mt-8 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery
              images={product.images}
              labels={product.imageLabels ?? []}
              name={product.name}
            />
          </div>

          <div className="min-w-0 lg:col-span-5">
            <div className="lg:sticky lg:top-[96px]">
              <p className="eyebrow text-ink-300">
                {product.badge ? `${product.badge} · ` : ""}
                {product.category}
              </p>
              <h1 className="mt-3 text-[clamp(2.1rem,3.6vw,3.2rem)] leading-[1.02]">{product.name}</h1>
              <p className="mt-3 text-[15px] text-ink-300">{product.subtitle}</p>
              <div className="mt-8">
                <PurchasePanel product={product} variantStock={variantStock} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- story */}
      <section id="story" className="scroll-mt-24 border-y border-sand bg-bone-dark">
        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-10 px-4 py-12 min-[360px]:px-5 md:px-10 md:py-24 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="eyebrow text-ink-300">The making of it</p>
            <h2 className="mt-4 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08]">{product.story}</h2>
            <dl className="mt-10 grid gap-px overflow-hidden border border-ink/12 bg-ink/12 sm:grid-cols-2">
              {[
                { label: "Materials", value: product.materials },
                { label: "Care", value: product.care },
              ].map((item) => (
                <div key={item.label} className="bg-bone p-6">
                  <dt className="eyebrow text-ink-300">{item.label}</dt>
                  <dd className="mt-3 text-[13.5px] leading-relaxed text-ink-500">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={140} className="grid grid-cols-2 gap-4">
            {storyImages.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className={`relative overflow-hidden bg-bone-dark ${index === 1 ? "mt-10" : "-mt-0"}`}
              >
                <div className="relative aspect-3/4">
                  <Image
                    src={image}
                    alt={storyLabels[index] || `${product.name} detail ${index + 1}`}
                    fill
                    sizes="(max-width: 1024px) 45vw, 24vw"
                    className="object-cover transition-transform duration-[1400ms] hover:scale-105"
                  />
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- reviews */}
      <div className="mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10 md:py-24">
        <ReviewsSection
          slug={product.slug}
          reviews={reviews}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
      </div>

      {/* ------------------------------------------------ complete the look */}
      {look.length > 0 && (
        <section className="border-t border-sand">
          <div className="mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-brass">Styled together</p>
                <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.08]">
                  Complete the look
                </h2>
              </div>
              <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-300">
                The pieces our stylists pair with the {product.name.toLowerCase()} — add them all
                in one place.
              </p>
            </div>

            <div className="mt-10 grid min-w-0 grid-cols-2 gap-x-4 gap-y-10 min-[360px]:gap-x-5 lg:grid-cols-4">
              {look.map((item, index) => (
                <Reveal key={item.id} delay={index * 90}>
                  <ProductCard product={item} compact />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- related */}
      <section className="border-t border-sand bg-linen">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10 md:py-24">
          <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-sage">Complete the look</p>
              <h2 className="mt-4 text-[clamp(2rem,3.8vw,3.2rem)]">Pairs well with</h2>
            </div>
            <Link
              href={`/shop?categories=${encodeURIComponent(product.category)}`}
              className="link-underline text-[11px] font-medium uppercase tracking-[0.2em] text-ink-500"
            >
              All {product.category.toLowerCase()}
            </Link>
          </Reveal>

          <div className="mt-12 grid min-w-0 grid-cols-2 gap-x-4 gap-y-12 min-[360px]:gap-x-5 lg:grid-cols-4">
            {related.map((item, index) => (
              <Reveal key={item.id} delay={index * 90}>
                <ProductCard product={item} compact />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
