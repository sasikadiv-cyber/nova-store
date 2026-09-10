"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "@/db/schema";
import type { VariantStockView } from "@/lib/variants";
import { useStore } from "./store-provider";
import { Price, Stars } from "./ui";

type QuickViewValue = { open: (product: Product) => void };

const QuickViewContext = createContext<QuickViewValue | null>(null);

export function useQuickView() {
  const context = useContext(QuickViewContext);
  if (!context) throw new Error("useQuickView must be used inside <QuickViewProvider>");
  return context;
}

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [variantStock, setVariantStock] = useState<VariantStockView[]>([]);
  const open = useCallback((next: Product) => {
    setProduct(next);
    setVariantStock([]);
    /* Availability is held per colour and size, so fetch it on open. */
    fetch(`/api/variants?productId=${next.id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { variants?: VariantStockView[] } | null) => {
        if (payload?.variants) setVariantStock(payload.variants);
      })
      .catch(() => setVariantStock([]));
  }, []);
  const close = useCallback(() => setProduct(null), []);

  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [product, close]);

  return (
    <QuickViewContext.Provider value={{ open }}>
      {children}
      {product ? (
        <QuickViewModal product={product} onClose={close} variantStock={variantStock} />
      ) : null}
    </QuickViewContext.Provider>
  );
}

function QuickViewModal({
  product,
  onClose,
  variantStock = [],
}: {
  product: Product;
  onClose: () => void;
  variantStock?: VariantStockView[];
}) {
  const { addItem } = useStore();
  const [imageIndex, setImageIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  const color = product.colors[colorIndex];
  const defaultSize = product.sizes[Math.floor((product.sizes.length - 1) / 2)] ?? product.sizes[0];

  const hasVariants = variantStock.length > 0;
  const colourStock = hasVariants
    ? variantStock.filter((row) => row.color === color?.name).reduce((t, row) => t + row.stock, 0)
    : null;
  const sizeStock = size
    ? (variantStock.find((row) => row.color === color?.name && row.size === size)?.stock ?? null)
    : null;
  const soldOutSizes = new Set(
    variantStock.filter((row) => row.color === color?.name && row.stock === 0).map((row) => row.size),
  );
  const effectiveStock = sizeStock ?? colourStock ?? product.stock;
  const maxQuantity = Math.max(1, Math.min(10, effectiveStock));
  const soldOut = effectiveStock === 0;

  function add() {
    if (!size) {
      setError(true);
      return;
    }
    addItem({
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      image: product.images[0],
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents,
      size,
      color: color?.name ?? "",
      maxQuantity,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2400);
  }

  return (
    <div className="fixed inset-0 z-[135] flex items-end justify-center sm:items-center">
      <div
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-scrim/60 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${product.name} quick view`}
        className="animate-modal-in relative z-10 flex max-h-[94svh] w-full max-w-[1000px] flex-col overflow-hidden bg-bone shadow-lift sm:max-h-[88svh]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-bone/85 text-ink backdrop-blur transition-colors hover:bg-ink hover:text-bone"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        <div className="hide-scrollbar grid overflow-y-auto md:grid-cols-2">
          {/* ------------------------------------------------------- gallery */}
          <div className="bg-bone-dark p-4 md:p-6">
            <div className="relative aspect-4/5 w-full overflow-hidden bg-bone-dark">
              {product.images.map((src, index) => (
                <Image
                  key={src}
                  src={src}
                  alt={`${product.name} — view ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  priority={index === 0}
                  className={`object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    index === imageIndex ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
                  }`}
                />
              ))}
              {product.badge && (
                <span className="absolute left-3 top-3 bg-band/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ivory backdrop-blur">
                  {product.badge}
                </span>
              )}
            </div>

            <div className="mt-3 flex gap-2.5">
              {product.images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`relative h-[64px] w-[48px] shrink-0 overflow-hidden bg-bone-dark transition-all duration-300 ${
                    index === imageIndex ? "ring-1 ring-ink" : "opacity-55 hover:opacity-100"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="48px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------- details */}
          <div className="flex flex-col p-6 md:p-8">
            <p className="eyebrow text-sage">{product.category}</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05]">{product.name}</h2>
            <p className="mt-2 text-[13.5px] text-ink-300">{product.subtitle}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[22px]">
                <Price cents={product.priceCents} />
                {product.compareAtCents && (
                  <span className="ml-2 text-[14px] text-ink-300 line-through">
                    <Price cents={product.compareAtCents} />
                  </span>
                )}
              </p>
              <span className="flex items-center gap-2 text-[12px] text-ink-300">
                <Stars rating={product.rating} className="text-brass" size={12} />
                <span className="tabular-nums">{product.rating.toFixed(1)}</span>
                <span>· {product.reviewCount} reviews</span>
              </span>
            </div>

            <p className="mt-5 text-[13.5px] leading-relaxed text-ink-500">{product.description}</p>

            {/* colour */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-ink-300">Colour</p>
                <p className="text-[12.5px]">{color?.name}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {product.colors.map((option, index) => (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => setColorIndex(index)}
                    aria-label={option.name}
                    aria-pressed={index === colorIndex}
                    className={`grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 ${
                      index === colorIndex ? "border-ink" : "border-ink/15 hover:border-ink/45"
                    }`}
                  >
                    <span
                      className="h-6 w-6 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: option.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* size */}
            <div className="mt-6">
              <p className="eyebrow text-ink-300">
                Size{product.sizeType === "shoe" ? " (EU)" : ""}
              </p>
              <div className="auto-tiles mt-3">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={soldOutSizes.has(option)}
                    onClick={() => {
                      setSize(option);
                      setError(false);
                    }}
                    title={soldOutSizes.has(option) ? "Sold out" : "Available"}
                    className={`border py-2.5 text-[12.5px] transition-colors ${
                      size === option
                        ? "border-ink bg-ink text-bone"
                        : soldOutSizes.has(option)
                          ? "cursor-not-allowed border-ink/10 text-ink-300/60 line-through"
                          : "border-ink/15 text-ink-500 hover:border-ink/50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {error && <p className="mt-2 text-[12.5px] text-ember">Please select a size first.</p>}
              <div className="mt-2.5 min-h-[18px] text-[12px]">
                {!hasVariants ? (
                  <span className={product.stock === 0 ? "text-ember" : "text-ink-500"}>
                    {product.stock === 0 ? "Currently out of stock" : `${product.stock} in stock`}
                  </span>
                ) : sizeStock === null ? (
                  (colourStock ?? 0) > 0 ? (
                    <span className="text-ink-500">{colourStock} available in {color?.name}</span>
                  ) : (
                    <span className="text-ember">{color?.name} is sold out</span>
                  )
                ) : sizeStock === 0 ? (
                  <span className="text-ember">Sold out in {color?.name} · {size}</span>
                ) : (
                  <span className={sizeStock <= 6 ? "text-ember" : "text-ink-500"}>
                    {sizeStock} left in {color?.name} · {size}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-auto pt-7">
              <button
                type="button"
                onClick={add}
                disabled={soldOut}
                className={`w-full py-4 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-500 ${
                  added
                    ? "bg-brass text-ink"
                    : soldOut
                      ? "cursor-not-allowed bg-ink/30 text-bone/70"
                      : "bg-ink text-bone hover:bg-ink-700"
                }`}
              >
                {added ? "Added to your bag ✓" : soldOut ? "Sold out" : "Add to bag"}
              </button>

              <div className="mt-4 flex items-center justify-between gap-4">
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  className="link-underline text-[11.5px] font-medium uppercase tracking-[0.16em] text-ink"
                >
                  View full details
                </Link>
                <span className="text-[11.5px] text-ink-300">
                  Default size {defaultSize} · {product.stock} in stock
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
