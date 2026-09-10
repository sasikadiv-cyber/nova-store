import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { ShopControls, SortSelect } from "@/components/shop-controls";
import { Reveal } from "@/components/ui";
import { buildQuery, parseFilters, type FilterState } from "@/lib/filters";
import {
  getCollectionBySlug,
  getFacets,
  getProducts,
  type ProductFilters,
} from "@/lib/queries";
import { px } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop all pieces",
  description:
    "Browse the full Nova collection — outerwear, knitwear, tailoring, dresses and hand-finished footwear, shipped worldwide.",
};

const DEFAULT_BAND = px(19222080, { w: 2000, h: 900 });

function chip(state: FilterState, mutate: (draft: FilterState) => FilterState) {
  const next = mutate(state);
  const query = buildQuery(next);
  return query ? `/shop?${query}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = parseFilters(params);

  const filters: ProductFilters = {
    categories: state.categories,
    genders: state.genders,
    sizes: state.sizes,
    families: state.families,
    collection: state.collection ?? undefined,
    search: state.search ?? undefined,
    minPrice: state.min ?? undefined,
    maxPrice: state.max ?? undefined,
    onSale: state.onSale,
    sort: state.sort,
  };

  const [items, facets, collection] = await Promise.all([
    getProducts(filters),
    getFacets(),
    state.collection ? getCollectionBySlug(state.collection) : Promise.resolve(null),
  ]);

  const bandImage = collection?.image ?? DEFAULT_BAND;
  const title = collection?.name ?? (state.search ? "Search results" : "All pieces");
  const description =
    collection?.description ??
    (state.search
      ? `Showing pieces matching “${state.search}”.`
      : "Every Nova piece in season — small-run outerwear, knitwear, tailoring, dresses and footwear, made with twelve mills and ateliers across four countries.");

  const chips: { label: string; href: string }[] = [
    ...state.categories.map((value) => ({
      label: value,
      href: chip(state, (draft) => ({
        ...draft,
        categories: draft.categories.filter((entry) => entry !== value),
      })),
    })),
    ...state.genders.map((value) => ({
      label: value,
      href: chip(state, (draft) => ({
        ...draft,
        genders: draft.genders.filter((entry) => entry !== value),
      })),
    })),
    ...state.sizes.map((value) => ({
      label: `Size ${value}`,
      href: chip(state, (draft) => ({ ...draft, sizes: draft.sizes.filter((entry) => entry !== value) })),
    })),
    ...state.families.map((value) => ({
      label: value,
      href: chip(state, (draft) => ({
        ...draft,
        families: draft.families.filter((entry) => entry !== value),
      })),
    })),
    ...(state.min != null
      ? [{ label: `From $${state.min}`, href: chip(state, (draft) => ({ ...draft, min: null })) }]
      : []),
    ...(state.max != null
      ? [{ label: `Up to $${state.max}`, href: chip(state, (draft) => ({ ...draft, max: null })) }]
      : []),
    ...(state.onSale ? [{ label: "On sale", href: chip(state, (draft) => ({ ...draft, onSale: false })) }] : []),
    ...(state.collection
      ? [
          {
            label: collection?.name ?? state.collection,
            href: chip(state, (draft) => ({ ...draft, collection: null })),
          },
        ]
      : []),
    ...(state.search
      ? [{ label: `“${state.search}”`, href: chip(state, (draft) => ({ ...draft, search: null })) }]
      : []),
  ];

  return (
    <>
      <section className="relative -mt-[68px] overflow-hidden bg-band pt-[68px] text-ivory md:-mt-[76px] md:pt-[76px]">
        <div className="absolute inset-0">
          <Image src={bandImage} alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-band via-band/70 to-band/40" />
        </div>
        <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-14 pt-16 md:px-10 md:pb-20 md:pt-24">
          <nav className="eyebrow flex items-center gap-2 text-ivory/45">
            <Link href="/" className="link-underline">
              Home
            </Link>
            <span>/</span>
            <span className="text-ivory/70">{collection ? "Collections" : "Shop"}</span>
          </nav>
          <h1 className="display-xl mt-6 text-[clamp(2.8rem,7vw,5.6rem)]">{title}</h1>
          <p className="mt-6 max-w-xl text-[14.5px] leading-relaxed text-ivory/70">{description}</p>
          <p className="eyebrow mt-8 text-ivory/50">
            {items.length} {items.length === 1 ? "piece" : "pieces"} · duties included
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-10 md:py-14">
        {chips.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {chips.map((item) => (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="flex items-center gap-2 border border-ink/15 px-3 py-1.5 text-[12px] text-ink-500 transition-colors hover:border-ink hover:text-ink"
              >
                {item.label}
                <span aria-hidden="true">×</span>
              </Link>
            ))}
            <Link href="/shop" className="link-underline ml-2 text-[11.5px] uppercase tracking-[0.16em] text-ink-300">
              Clear all
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-10 xl:gap-14">
          <ShopControls facets={facets} state={state} />

          <div className="min-w-0 flex-1">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-ink/12 pb-4">
              <p className="text-[13px] text-ink-300">
                Showing <span className="text-ink">{items.length}</span> of {facets.total} pieces
              </p>
              <SortSelect state={state} />
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-5 border border-dashed border-ink/20 px-6 py-24 text-center">
                <p className="font-display text-3xl">Nothing matches those filters</p>
                <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-300">
                  Try widening your price range or clearing a size — our runs are small, so popular sizes
                  sell out quickly.
                </p>
                <Link
                  href="/shop"
                  className="mt-2 bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
                >
                  Reset filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3 md:gap-x-6 md:gap-y-12 2xl:grid-cols-4">
                {items.map((product, index) => (
                  <Reveal key={product.id} delay={(index % 6) * 70}>
                    <ProductCard product={product} priority={index < 3} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
