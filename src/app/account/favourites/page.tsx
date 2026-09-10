import Image from "next/image";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { SubmitButton } from "@/components/admin/submit-button";
import { Price, Stars } from "@/components/ui";
import { db } from "@/db";
import { favourites, products } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { toggleFavouriteAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wishlist" };

export default async function FavouritesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) return null;

  const rows = await db
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      subtitle: products.subtitle,
      priceCents: products.priceCents,
      compareAtCents: products.compareAtCents,
      stock: products.stock,
      rating: products.rating,
      reviewCount: products.reviewCount,
      image: products.images,
    })
    .from(favourites)
    .innerJoin(products, eq(products.id, favourites.productId))
    .where(eq(favourites.customerId, customer.id))
    .orderBy(desc(favourites.createdAt));

  return (
    <div>
      <p className="eyebrow text-sage">Saved</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Wishlist</h1>
      <p className="mt-3 text-[13px] text-ink-300">
        {rows.length} piece{rows.length === 1 ? "" : "s"} saved — we will tell you if one is about
        to sell out.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 border border-dashed border-sand bg-linen px-5 py-16 text-center">
          <p className="mx-auto max-w-sm text-[13.5px] leading-relaxed text-ink-300">
            Tap the heart on any piece to save it here for later.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
          >
            Browse the collection
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => {
            const soldOut = row.stock === 0;
            return (
              <li key={row.productId} className="flex flex-col">
                <div className="relative overflow-hidden bg-bone-dark">
                  <Link href={`/products/${row.slug}`} className="block">
                    <div className="relative aspect-3/4 w-full">
                      <Image
                        src={row.image[0] ?? ""}
                        alt={row.name}
                        fill
                        sizes="(max-width: 768px) 45vw, 22vw"
                        className={`object-cover transition-all duration-700 ${
                          soldOut ? "opacity-45 grayscale" : "hover:scale-105"
                        }`}
                      />
                    </div>
                  </Link>

                  {soldOut && (
                    <span className="absolute inset-x-3 top-3 bg-ember px-2 py-1 text-center text-[9.5px] font-medium uppercase tracking-[0.16em] text-bone">
                      Out of stock
                    </span>
                  )}

                  <form
                    action={toggleFavouriteAction}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-bone/90 text-ember backdrop-blur transition-colors hover:bg-bone"
                  >
                    <input type="hidden" name="productId" value={row.productId} />
                    <input type="hidden" name="redirectTo" value="/account/favourites" />
                    <SubmitButton
                      label="♥"
                      pendingLabel="·"
                      className="text-[15px] leading-none"
                    />
                  </form>
                </div>

                <div className="flex flex-1 flex-col pt-4">
                  <Link href={`/products/${row.slug}`} className="link-underline text-[14px]">
                    {row.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-ink-300">{row.subtitle}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <p className="text-[14px]">
                      <Price cents={row.priceCents} />
                      {row.compareAtCents && (
                        <span className="ml-2 text-[11.5px] text-ink-300 line-through">
                          <Price cents={row.compareAtCents} />
                        </span>
                      )}
                    </p>
                    <span className="flex items-center gap-1.5 text-ink-300">
                      <Stars rating={row.rating} size={11} />
                      <span className="text-[11px] tabular-nums">({row.reviewCount})</span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
