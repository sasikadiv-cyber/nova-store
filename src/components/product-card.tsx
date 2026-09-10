"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { Product } from "@/db/schema";
import type { VariantStockView } from "@/lib/variants";
import { useQuickView } from "./quick-view";
import { useStore } from "./store-provider";
import { Price, Stars } from "./ui";

export function ProductCard({
  product,
  priority = false,
  compact = false,
}: {
  product: Product;
  priority?: boolean;
  compact?: boolean;
}) {
  const { addItem, favourites, favouritesReady, toggleFavourite } = useStore();
  const { open: openQuickView } = useQuickView();
  const [hovered, setHovered] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const saved = favourites.includes(product.id);
  const soldOut = product.stock === 0;

  const secondary = product.images[1] ?? product.images[0];
  const discount =
    product.compareAtCents && product.compareAtCents > product.priceCents
      ? Math.round(100 - (product.priceCents / product.compareAtCents) * 100)
      : null;

  const defaultSize = product.sizes[Math.floor((product.sizes.length - 1) / 2)] ?? product.sizes[0];
  const defaultColor = product.colors[0]?.name ?? "";

  const quickAdd = () =>
    addItem({
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      image: product.images[0],
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents,
      size: defaultSize,
      color: defaultColor,
      maxQuantity: Math.min(10, product.stock),
    });

  return (
    <article
      className="group relative flex h-full flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-lift relative overflow-hidden bg-bone-dark">
        <Link href={`/products/${product.slug}`} className="block" aria-label={product.name}>
          <div className={`relative ${compact ? "aspect-4/5" : "aspect-3/4"} w-full`}>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 480px) 55vw, (max-width: 768px) 40vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className={`object-cover transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                soldOut ? "scale-100 opacity-40 grayscale" : hovered ? "scale-105 opacity-0" : "scale-100 opacity-100"
              }`}
            />
            <Image
              src={secondary}
              alt=""
              fill
              sizes="(max-width: 480px) 55vw, (max-width: 768px) 40vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-cover transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                hovered ? "scale-100 opacity-100" : "scale-105 opacity-0"
              }`}
            />
          </div>
        </Link>

        {soldOut && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-ink/20 backdrop-blur-[1px]">
            <span className="h-px w-9 bg-bone/55" />
            <span className="border border-bone/45 bg-bone/10 px-3.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.3em] text-bone">
              Out of stock
            </span>
            <span className="h-px w-9 bg-bone/55" />
            <span className="text-[8.5px] uppercase tracking-[0.2em] text-bone/70">
              Notify me
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-2">
          {product.badge && (
            <span className="bg-band/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ivory backdrop-blur">
              {product.badge}
            </span>
          )}
          {discount && (
            <span className="bg-ember px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-bone">
              −{discount}%
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => openQuickView(product)}
            aria-label={`Quick view ${product.name}`}
            title="Quick view"
            className="grid h-9 w-9 place-items-center rounded-full bg-bone/85 text-ink backdrop-blur transition-all duration-500 hover:bg-ink hover:text-bone max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
              <circle cx="12" cy="12" r="2.9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={async () => {
              const outcome = await toggleFavourite(product.id);
              if (outcome === "auth") {
                setNotice("Sign in to save pieces to your wishlist.");
                window.setTimeout(() => setNotice(null), 3200);
              }
            }}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={saved}
            title={saved ? "Remove from wishlist" : "Save to wishlist"}
            className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur transition-all duration-500 ${
              saved
                ? "bg-ember text-bone"
                : "bg-bone/85 text-ink hover:bg-ink hover:text-bone"
            } max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M12 20.5s-7.5-4.6-7.5-9.8A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.5c0 5.2-7.5 9.8-7.5 9.8z" />
            </svg>
          </button>
        </div>

        {/* desktop hover quick-add */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 max-md:hidden">
          <button
            type="button"
            onClick={quickAdd}
            disabled={soldOut}
            className={`w-full py-3 text-[11px] font-medium uppercase tracking-[0.2em] backdrop-blur transition-colors ${
              soldOut
                ? "cursor-not-allowed bg-ink/40 text-bone/70"
                : "bg-band/95 text-ivory hover:bg-char"
            }`}
          >
            {soldOut ? "Out of stock" : `Quick add — ${defaultSize}`}
          </button>
        </div>
      </div>

      <div className={`flex flex-1 flex-col pt-4 ${soldOut ? "opacity-55" : ""}`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <Link
              href={`/products/${product.slug}`}
              className="link-underline text-[13.5px] leading-snug sm:text-[15px]"
            >
              {product.name}
            </Link>
            <p className="mt-0.5 truncate text-[12px] text-ink-300 sm:text-[12.5px]">
              {product.subtitle}
            </p>
          </div>
          <p className="mt-0.5 shrink-0 text-[13.5px] sm:mt-0 sm:text-right sm:text-[15px]">
            <Price cents={product.priceCents} />
            {product.compareAtCents && (
              <span className="ml-2 text-[11.5px] text-ink-300 line-through sm:text-[12px]">
                <Price cents={product.compareAtCents} />
              </span>
            )}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="flex min-w-0 items-center gap-1.5">
            {product.colors.slice(0, 4).map((color) => (
              <span
                key={color.name}
                title={color.name}
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-ink/15 ring-offset-1 ring-offset-bone sm:h-3 sm:w-3"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {product.colors.length > 4 && (
              <span className="text-[11px] text-ink-300">+{product.colors.length - 4}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-ink-300">
            <Stars rating={product.rating} size={11} />
            <span className="text-[11px] tabular-nums">({product.reviewCount})</span>
          </div>
        </div>

        {/* mobile quick-add */}
        <button
          type="button"
          onClick={quickAdd}
          className={`mt-3.5 w-full border py-2.5 text-[10.5px] font-medium uppercase tracking-[0.18em] transition-colors md:hidden ${
            soldOut
              ? "cursor-not-allowed border-ink/10 text-ink-300"
              : "border-ink/15 text-ink-500 hover:border-ink hover:bg-ink hover:text-bone"
          }`}
        >
          {soldOut ? "Out of stock" : "Add to bag"}
        </button>
        {notice && (
          <p className="mt-2.5 animate-fade-in text-[11px] leading-snug text-ember">{notice}</p>
        )}
      </div>
    </article>
  );
}
