"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type { Product, Review } from "@/db/schema";
import type { VariantStockView } from "@/lib/variants";
import { useStore } from "./store-provider";
import { Price, Spinner, Stars } from "./ui";

/* ------------------------------------------------------------------ gallery */

export function ProductGallery({
  images,
  name,
  labels = [],
}: {
  images: string[];
  name: string;
  labels?: string[];
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const total = images.length;

  const go = (direction: number) => setActive((current) => (current + direction + total) % total);

  /** Tracks the pointer so the zoom grows out of the exact spot under the cursor. */
  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x)).toFixed(1)}% ${Math.min(100, Math.max(0, y)).toFixed(1)}%`);
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      <div className="hide-scrollbar flex gap-3 overflow-x-auto md:flex-col md:overflow-visible">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`View image ${index + 1}`}
            className={`relative h-[104px] w-[78px] shrink-0 overflow-hidden bg-bone-dark transition-all duration-300 ${
              index === active ? "ring-1 ring-ink" : "opacity-60 hover:opacity-100"
            }`}
          >
            <Image src={src} alt="" fill sizes="78px" className="object-cover" />
          </button>
        ))}
      </div>

      <div
        className={`group relative aspect-4/5 w-full flex-1 overflow-hidden bg-bone-dark ${
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={onMove}
      >
        {images.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={labels[index] || `${name} — view ${index + 1}`}
            fill
            priority={index === 0}
            sizes="(max-width: 768px) 100vw, 46vw"
            style={{ transformOrigin: origin }}
            className={`object-cover transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              index === active ? "opacity-100" : "scale-[1.04] opacity-0"
            } ${zoomed ? "scale-[2.1]" : "scale-100"}`}
          />
        ))}

        <span className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 bg-band/70 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-ivory backdrop-blur transition-opacity duration-300 max-md:hidden">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4.2-4.2M11 8v6M8 11h6" />
          </svg>
          Hover to zoom
        </span>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-bone/85 text-ink opacity-0 backdrop-blur transition-all duration-400 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M20 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-bone/85 text-ink opacity-0 backdrop-blur transition-all duration-400 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}

        <span className="absolute bottom-4 right-4 bg-band/70 px-2.5 py-1 text-[10.5px] tabular-nums tracking-[0.12em] text-ivory backdrop-blur">
          {active + 1} / {total}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- accordion */

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink/12">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left text-[13px] uppercase tracking-[0.14em]"
      >
        {title}
        <span className={`transition-transform duration-400 ${open ? "rotate-45" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-[13.5px] leading-relaxed text-ink-500">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- purchase panel */

export function PurchasePanel({
  product,
  variantStock = [],
}: {
  product: Product;
  /** Stock per colour-and-size combination, when the catalogue provides it. */
  variantStock?: VariantStockView[];
}) {
  const { addItem } = useStore();
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [barMounted, setBarMounted] = useState(false);

  useEffect(() => setBarMounted(true), []);

  /* The purchase panel is sticky, so watch the sections that follow it:
     once the story / reviews block enters view, slide the bar in. */
  useEffect(() => {
    const target = document.getElementById("story") ?? document.getElementById("reviews");
    if (target && typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) setShowBar(entry.isIntersecting);
        },
        { rootMargin: "-90px 0px -30% 0px", threshold: 0 },
      );
      observer.observe(target);
      return () => observer.disconnect();
    }
    const onScroll = () => setShowBar(window.scrollY > 720);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const color = product.colors[colorIndex];

  /* Stock for the selected colour, then narrowed to the selected size.
     Products without variant rows fall back to the product total — an empty
     colour sum must never be mistaken for "sold out". */
  const hasVariants = variantStock.length > 0;
  const colourRows = hasVariants
    ? variantStock.filter((row) => row.color === color?.name)
    : [];
  const colourStock = hasVariants
    ? colourRows.reduce((total, row) => total + row.stock, 0)
    : null;
  const sizeStock = size
    ? (variantStock.find((row) => row.color === color?.name && row.size === size)?.stock ?? null)
    : null;
  const soldOutSizes = new Set(
    variantStock.filter((row) => row.color === color?.name && row.stock === 0).map((row) => row.size),
  );
  const effectiveStock = sizeStock ?? colourStock ?? product.stock;
  const maxQuantity = Math.max(1, Math.min(10, effectiveStock));
  const lowStock = effectiveStock > 0 && effectiveStock <= 6;
  const soldOut = effectiveStock === 0;

  function onAdd() {
    if (!size) {
      setError(true);
      return;
    }
    setError(false);
    addItem({
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      image: product.images[0],
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents,
      size,
      color: color?.name ?? "",
      quantity,
      maxQuantity,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[26px] md:text-[30px]">
          <Price cents={product.priceCents} />
          {product.compareAtCents && (
            <span className="ml-3 text-[17px] text-ink-300 line-through">
              <Price cents={product.compareAtCents} />
            </span>
          )}
        </p>
        <span className="eyebrow text-ink-300">{product.gender}</span>
      </div>

      <div className="mt-4 flex items-center gap-2.5 text-[12.5px] text-ink-300">
        <Stars rating={product.rating} className="text-brass" size={13} />
        <span className="tabular-nums">{product.rating.toFixed(1)}</span>
        <a href="#reviews" className="link-underline">
          {product.reviewCount} reviews
        </a>
      </div>

      <p className="mt-6 text-[14.5px] leading-relaxed text-ink-500">{product.description}</p>

      {/* colour */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-ink-300">Colour</p>
          <p className="text-[12.5px]">{color?.name}</p>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-3">
          {product.colors.map((option, index) => (
            <button
              key={option.name}
              type="button"
              onClick={() => setColorIndex(index)}
              aria-label={option.name}
              aria-pressed={index === colorIndex}
              title={option.name}
              className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-300 ${
                index === colorIndex ? "border-ink" : "border-ink/15 hover:border-ink/45"
              }`}
            >
              <span
                className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: option.hex }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* size */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-ink-300">
            Size{product.sizeType === "shoe" ? " (EU)" : ""}
          </p>
          <button
            type="button"
            className="link-underline text-[11.5px] uppercase tracking-[0.14em] text-ink-300"
            onClick={() => {
              const target = document.getElementById("size-guide");
              target?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            Size guide
          </button>
        </div>
        <div className="auto-tiles mt-3.5">
          {product.sizes.map((option) => {
            const active = size === option;
            const out = soldOutSizes.has(option);
            return (
              <button
                key={option}
                type="button"
                disabled={out}
                onClick={() => {
                  setSize(option);
                  setError(false);
                }}
                title={out ? `Sold out in ${color?.name ?? ""}` : `${option} available`}
                className={`border py-3 text-[13px] transition-colors ${
                  active
                    ? "border-ink bg-ink text-bone"
                    : out
                      ? "cursor-not-allowed border-ink/10 text-ink-300/60 line-through"
                      : "border-ink/15 text-ink-500 hover:border-ink/50"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {error && (
          <p className="mt-2.5 text-[12.5px] text-ember">Please select a size first.</p>
        )}

        <div className="mt-3.5 min-h-[20px] text-[12.5px]">
          {!hasVariants ? (
            <span className={product.stock === 0 ? "text-ember" : "text-ink-500"}>
              {product.stock === 0 ? "Currently out of stock" : `${product.stock} in stock`}
            </span>
          ) : sizeStock === null ? (
            (colourStock ?? 0) > 0 ? (
              <span className="text-ink-500">
                {colourStock} available in {color?.name}
                {soldOutSizes.size > 0 && (
                  <span className="text-ink-300">
                    {" "}
                    · {soldOutSizes.size} size{soldOutSizes.size === 1 ? "" : "s"} sold out
                  </span>
                )}
              </span>
            ) : (
              <span className="text-ember">{color?.name} is sold out</span>
            )
          ) : sizeStock === 0 ? (
            <span className="text-ember">
              Sold out in {color?.name} · {size}
            </span>
          ) : (
            <span className={lowStock ? "text-ember" : "text-ink-500"}>
              {sizeStock} left in {color?.name} · {size}
            </span>
          )}
        </div>
      </div>

      {/* quantity + add */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center justify-between border border-ink/15 sm:w-[132px]">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Decrease quantity"
            className="grid h-[52px] w-11 place-items-center transition-colors hover:bg-ink/5"
          >
            −
          </button>
          <span className="text-[14px] tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
            aria-label="Increase quantity"
            className="grid h-[52px] w-11 place-items-center transition-colors hover:bg-ink/5"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={soldOut}
          className={`relative flex-1 overflow-hidden py-4 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-500 ${
            added
              ? "bg-brass text-ink"
              : soldOut
                ? "cursor-not-allowed bg-ink/30 text-bone"
                : "bg-ink text-bone hover:bg-ink-700"
          }`}
        >
          {added ? "Added to your bag ✓" : soldOut ? "Sold out" : "Add to bag"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-300">
        <span className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              soldOut ? "bg-ember" : lowStock ? "bg-ember" : "bg-ok"
            }`}
          />
          {soldOut
            ? "Sold out — this piece is unavailable"
            : lowStock
              ? `Only ${effectiveStock} left`
              : "In stock, ships within 24 hours"}
        </span>
        <span>Free returns within 30 days</span>
      </div>

      {/* ------------------------------------------- sticky purchase bar */}
      {/* Portalled to <body>: the parent panel is position:sticky, which
          creates its own stacking context and trapped the bar's z-index, so
          the story-section images painted over it. From <body> the bar sits
          above page content and below the header, drawer, sheets and modals. */}
      {barMounted
        ? createPortal(
            <div
              className={`fixed inset-x-0 bottom-0 z-[105] border-t border-sand bg-bone/95 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                showBar ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-3 md:px-10">
                <div className="relative hidden h-14 w-11 shrink-0 overflow-hidden bg-bone-dark sm:block">
                  <Image src={product.images[0]} alt="" fill sizes="44px" className="object-cover" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] leading-tight">{product.name}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-ink-300">
                    {color?.name ?? ""}
                    {size ? ` · ${size}` : " · select a size"}
                  </p>
                </div>

                <p className="shrink-0 text-[15px]">
                  <Price cents={product.priceCents * quantity} />
                </p>

                <button
                  type="button"
                  onClick={onAdd}
                  className={`shrink-0 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${
                    added ? "bg-brass text-ink" : "bg-ink text-bone hover:bg-ink-700"
                  }`}
                >
                  {added ? "Added \u2713" : "Add to bag"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div id="size-guide" className="mt-10">
        <Accordion title="Size &amp; fit">
          <ul className="space-y-2">
            {product.details.map((detail) => (
              <li key={detail} className="flex gap-2.5">
                <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-brass" />
                {detail}
              </li>
            ))}
          </ul>
        </Accordion>
        <Accordion title="Materials &amp; make">{product.materials}</Accordion>
        <Accordion title="Care">{product.care}</Accordion>
        <Accordion title="Shipping &amp; returns" defaultOpen>
          Complimentary carbon-neutral shipping on orders over $250 to all 94 destinations. Express
          delivery in 2–4 business days via DHL. Duties and import taxes are calculated and paid at
          checkout — nothing to settle on delivery. Returns are free within 30 days.
        </Accordion>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- reviews */

const SIZE_LABELS: Record<string, string> = {
  1: "Runs small",
  2: "Slightly small",
  3: "True to size",
  4: "Slightly large",
  5: "Runs large",
};

export function ReviewsSection({
  slug,
  reviews,
  rating,
  reviewCount,
}: {
  slug: string;
  reviews: Review[];
  rating: number;
  reviewCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [form, setForm] = useState({
    author: "",
    location: "",
    rating: 5,
    title: "",
    body: "",
  });

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
      if (!response.ok) throw new Error("failed");
      setStatus("done");
      setForm({ author: "", location: "", rating: 5, title: "", body: "" });
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-ink/12 pt-14">
      <div className="grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-20">
        <div>
          <p className="eyebrow text-ink-300">Client reviews</p>
          <h2 className="mt-4 text-[clamp(2rem,3.6vw,3rem)]">
            {rating.toFixed(1)} out of 5
          </h2>
          <Stars rating={rating} className="mt-4 text-brass" size={16} />
          <p className="mt-3 text-[13px] text-ink-300">
            Based on {reviewCount} verified purchases
          </p>

          <div className="mt-8 space-y-2.5">
            {distribution.map((row) => (
              <div key={row.star} className="flex items-center gap-3 text-[12px] text-ink-300">
                <span className="w-3 tabular-nums">{row.star}</span>
                <div className="h-[3px] flex-1 overflow-hidden bg-ink/10">
                  <div
                    className="h-full bg-brass transition-[width] duration-700"
                    style={{ width: `${reviews.length ? (row.count / reviews.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-4 text-right tabular-nums">{row.count}</span>
              </div>
            ))}
          </div>

          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-8 w-full border border-ink py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-bone"
            >
              Write a review
            </button>
          ) : (
            <form onSubmit={submit} className="mt-8 flex flex-col gap-4 border border-ink/12 p-5">
              <p className="text-[13px] uppercase tracking-[0.14em]">Share your experience</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={form.author}
                  onChange={(value) => setForm({ ...form, author: value })}
                  required
                />
                <Field
                  label="City, Country"
                  value={form.location}
                  onChange={(value) => setForm({ ...form, location: value })}
                />
              </div>

              <div>
                <p className="eyebrow text-ink-300">Rating</p>
                <div className="mt-2 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, rating: star })}
                      aria-label={`${star} stars`}
                      className={`text-[22px] leading-none transition-transform hover:scale-110 ${
                        star <= form.rating ? "text-brass" : "text-ink/20"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-[12px] text-ink-300">{SIZE_LABELS[form.rating]}</span>
                </div>
              </div>

              <Field
                label="Headline"
                value={form.title}
                onChange={(value) => setForm({ ...form, title: value })}
                required
              />

              <label className="block">
                <span className="eyebrow text-ink-300">Your review</span>
                <textarea
                  value={form.body}
                  onChange={(event) => setForm({ ...form, body: event.target.value })}
                  required
                  rows={4}
                  className="mt-2 w-full border border-ink/15 bg-transparent px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex items-center gap-2 bg-ink px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone disabled:opacity-60"
                >
                  {status === "loading" && <Spinner />}
                  Submit review
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="link-underline text-[12px] text-ink-300"
                >
                  Cancel
                </button>
              </div>

              {status === "done" && (
                <p className="text-[12.5px] text-ok">
                  Thank you — your review is now live on this page.
                </p>
              )}
              {status === "error" && (
                <p className="text-[12.5px] text-ember">
                  Something went wrong. Please try again in a moment.
                </p>
              )}
            </form>
          )}
        </div>

        <div className="divide-y divide-ink/10">
          {reviews.map((review) => (
            <article key={review.id} className="py-7 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-sand text-[13px] font-medium">
                    {review.author.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[14px]">{review.author}</p>
                    <p className="text-[11.5px] text-ink-300">{review.location || "Verified client"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Stars rating={review.rating} className="text-brass" size={13} />
                  {review.verified && (
                    <span className="border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-300">
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mt-4 text-[19px]">{review.title}</h3>
              <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-500">{review.body}</p>
              <p className="mt-3 text-[11.5px] text-ink-300">
                {new Date(review.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-ink-300">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border border-ink/15 bg-transparent px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink"
      />
    </label>
  );
}
