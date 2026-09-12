"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { Collection, Product } from "@/db/schema";
import { ImageEditor } from "./image-editor";
import { VariantStockEditor } from "./variant-stock-editor";
import { ColourEditor, SizeEditor } from "./variant-editor";

const CATEGORIES = ["Outerwear", "Knitwear", "Footwear", "Dresses", "Tailoring", "Essentials"];
const GENDERS = ["Women", "Men", "Unisex"];

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

/**
 * Posts to /api/admin/products rather than a server action, so the write path
 * never depends on the build-time action registry. Saving shows an immediate
 * pending state and surfaces any server error inline.
 */
export function ProductForm({
  product,
  collections,
  variantStocks,
}: {
  product?: Product;
  collections: Collection[];
  variantStocks?: { color: string; size: string; stock: number }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colourText = (product?.colors ?? [])
    .map((colour) => `${colour.name} | ${colour.hex} | ${colour.family}`)
    .join("\n");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as { ok?: boolean; error?: string; detail?: string } | null;

      if (!response.ok || !payload?.ok) {
        const detail = payload?.detail ? ` (${payload.detail})` : "";
        throw new Error(`${payload?.error ?? "Could not save this product."}${detail}`);
      }

      /* A full page load rather than router.push: the client router cache can
         otherwise serve a stale product list, which made new products look
         like they had not saved. */
      window.location.assign("/admin/products?saved=1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this product.");
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="relative mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* ------------------------------------ left column (never widened by content) */}
      <div className="min-w-0 space-y-8">
      <div className="space-y-6 border border-sand bg-linen p-6">
        <h2 className="text-xl">The piece</h2>

        <label className="block">
          <span className={label}>Name</span>
          <input name="name" required defaultValue={product?.name ?? ""} className={field} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Slug (URL)</span>
            <input
              name="slug"
              defaultValue={product?.slug ?? ""}
              placeholder="auto-generated from the name"
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Badge</span>
            <input
              name="badge"
              defaultValue={product?.badge ?? ""}
              placeholder="Atelier, Limited, Runway…"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className={label}>Subtitle</span>
          <input name="subtitle" defaultValue={product?.subtitle ?? ""} className={field} />
        </label>

        <label className="block">
          <span className={label}>Description</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={product?.description ?? ""}
            className={field}
          />
        </label>

        <label className="block">
          <span className={label}>Story (the making of it)</span>
          <textarea name="story" rows={3} defaultValue={product?.story ?? ""} className={field} />
        </label>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Category</span>
            <select name="category" defaultValue={product?.category ?? "Essentials"} className={field}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Shop for</span>
            <select name="gender" defaultValue={product?.gender ?? "Unisex"} className={field}>
              {GENDERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Collection</span>
            <select
              name="collectionSlug"
              defaultValue={product?.collectionSlug ?? collections[0]?.slug}
              className={field}
            >
              {collections.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className={label}>Images</span>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-300">
            Tap <span className="text-ink">Add image</span>, paste the link and give it a name — the
            preview appears as you type. The first image is the product card.
          </p>
          <div className="mt-3">
            <ImageEditor
              initial={(product?.images ?? [])
                .map((url, index) => {
                  const name = product?.imageLabels?.[index] ?? "";
                  return name ? `${name} | ${url}` : url;
                })
                .join("\n")}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Details — one per line</span>
            <textarea
              name="details"
              rows={4}
              defaultValue={(product?.details ?? []).join("\n")}
              className={field}
            />
          </label>
          <div className="space-y-5">
            <label className="block">
              <span className={label}>Materials</span>
              <textarea
                name="materials"
                rows={2}
                defaultValue={product?.materials ?? ""}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Care</span>
              <textarea name="care" rows={2} defaultValue={product?.care ?? ""} className={field} />
            </label>
          </div>
        </div>
      </div>

      {/* ------------------------------------------- stock by colour & size */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl">Stock by colour &amp; size</h2>
          <p className="text-[11.5px] uppercase tracking-[0.14em] text-ink-300">
            Same card as stock management
          </p>
        </div>
        <VariantStockEditor
          formRef={formRef}
          productName={product?.name}
          productCategory={product?.category}
          productImage={product?.images?.[0]}
          productSlug={product?.slug}
          initialColors={(product?.colors ?? []).map((entry) => entry.name)}
          initialSizes={product?.sizes ?? ["S", "M", "L"]}
          initialStocks={variantStocks}
          productColors={product?.colors ?? []}
          startInEdit={!product}
        />
      </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="space-y-6 border border-sand bg-linen p-6">
          <h2 className="text-xl">Pricing &amp; stock</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Price (USD)</span>
              <input
                name="price"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Compare-at (optional)</span>
              <input
                name="compareAt"
                type="number"
                step="0.01"
                min={0}
                defaultValue={
                  product?.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : ""
                }
                placeholder="creates a sale badge"
                className={field}
              />
            </label>
          </div>

          <label className="block">
            <span className={label}>Stock on hand (auto)</span>
            <input
              name="stock"
              type="number"
              min={0}
              defaultValue={product?.stock ?? 0}
              className={`${field} bg-bone-dark text-ink-300`}
              readOnly
            />
            <span className="mt-2 block text-[11.5px] text-ink-300">
              Filled in from the colour × size counts below.
            </span>
          </label>
        </div>

        <div className="space-y-6 border border-sand bg-linen p-6">
          <h2 className="text-xl">Complete the look</h2>
          <label className="block">
            <span className="eyebrow text-ink-300">Product slugs — one per line</span>
            <textarea
              name="completeLook"
              rows={4}
              defaultValue={(product?.completeLook ?? []).join("\n")}
              className={field}
              placeholder={"meridian-cotton-trench\natelier-loafer"}
            />
            <span className="mt-2 block text-[12px] text-ink-300">
              The pieces shown with this one on its product page, styled as a set.
            </span>
          </label>

          <h2 className="text-xl">Story images</h2>
          <p className="text-[12px] leading-relaxed text-ink-300">
            These appear in the large <span className="text-ink">&ldquo;The making of it&rdquo;</span>{" "}
            block on the product page, next to the story text. Leave empty and Nova falls back to the
            third and fourth gallery images.
          </p>
          <ImageEditor
            name="storyImages"
            initial={(product?.storyImages ?? [])
              .map((url, index) => {
                const name = product?.storyImageLabels?.[index] ?? "";
                return name ? `${name} | ${url}` : url;
              })
              .join("\n")}
          />
        </div>

        <div className="space-y-6 border border-sand bg-linen p-6">
          <h2 className="text-xl">Colours</h2>
          <p className="text-[12px] leading-relaxed text-ink-300">
            Pick from the colour wheel or tap a Nova preset — the name and family are filled in for
            you. Every colourway appears on the product page swatches and in the shop colour filter.
          </p>
          <ColourEditor initial={colourText} />

          <div className="border-t border-sand pt-6">
            <h2 className="text-xl">Sizes</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-300">
              Choose a size scale, then tap the sizes you stock. Custom sizes can be typed in.
            </p>
            <SizeEditor
              initial={(product?.sizes ?? ["S", "M", "L"]).join(", ")}
              initialType={product?.sizeType ?? "alpha"}
            />
          </div>
        </div>

        <div className="space-y-4 border border-sand bg-linen p-6">
          <h2 className="text-xl">Merchandising</h2>
          <p className="text-[12px] leading-relaxed text-ink-300">
            Featured pieces appear in the home page hero card and the featured rail. New in feeds the
            &ldquo;Just landed&rdquo; section and the newest sort order.
          </p>
          {(
            [
              { name: "isFeatured", label: "Feature on the home page", on: product?.isFeatured },
              { name: "isNewArrival", label: "Show under New in", on: product?.isNewArrival },
              { name: "isBestSeller", label: "Mark as best seller", on: product?.isBestSeller },
            ] as const
          ).map((flag) => (
            <label key={flag.name} className="flex items-center gap-3 text-[13.5px]">
              <input
                type="checkbox"
                name={flag.name}
                defaultChecked={Boolean(flag.on)}
                className="h-4 w-4 accent-ink"
              />
              {flag.label}
            </label>
          ))}
        </div>

        {error && (
          <p className="border-l-2 border-ember bg-linen px-4 py-3 text-[13px] text-ember">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={`inline-flex items-center justify-center gap-2 bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700 ${
              pending ? "cursor-wait opacity-70" : ""
            }`}
          >
            {pending && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {pending
              ? product
                ? "Saving changes"
                : "Publishing product"
              : product
                ? "Save changes"
                : "Create product"}
          </button>
          <Link
            href="/admin/products"
            className="link-underline text-[11.5px] uppercase tracking-[0.16em] text-ink-300"
          >
            Cancel
          </Link>
        </div>
      </div>

      {pending && (
        <div className="animate-fade-in pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-bone/70 pt-20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 border border-sand bg-linen px-5 py-3.5 shadow-panel">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink border-t-transparent" />
            <span className="eyebrow text-ink-500">
              {product ? "Saving this product" : "Publishing this product"}…
            </span>
          </div>
        </div>
      )}
    </form>
  );
}
