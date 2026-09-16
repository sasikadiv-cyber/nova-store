import Link from "next/link";
import { desc, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { Stars } from "@/components/ui";
import { deleteReviewAction } from "../actions";
import { SubmitButton } from "@/components/admin/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminReviews({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const days = Math.min(365, Math.max(1, Number(typeof params.days === "string" ? params.days : 90)));
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await db
    .select({
      review: reviews,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(gte(reviews.createdAt, since))
    .orderBy(desc(reviews.createdAt))
    .limit(120);

  return (
    <div>
      <p className="eyebrow text-sage">Community</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Reviews</h1>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 text-ink-300">Period</span>
          {[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "365", label: "1 year" },
          ].map((option) => (
            <Link
              key={option.value}
              href={`/admin/reviews?days=${option.value}`}
              className={`border px-3 py-1.5 text-[11.5px] transition-colors ${
                String(days) === option.value
                  ? "border-ink bg-ink text-bone"
                  : "border-ink/15 text-ink-500 hover:border-ink/45"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      <p className="mt-3 text-[13px] text-ink-300">
        {rows.length} client reviews. Removing one recalculates the product rating automatically.
      </p>

      {params.deleted && (
        <p className="mt-6 border-l-2 border-ember bg-linen px-4 py-3 text-[13px]">
          Review removed and the product rating recalculated.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-8 border border-dashed border-sand px-5 py-16 text-center text-[13.5px] text-ink-300">
          No reviews yet.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-sand border border-sand bg-linen">
          {rows.map(({ review, productName, productSlug }) => (
            <article key={review.id} className="flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars rating={review.rating} className="text-brass" size={12} />
                  <span className="text-[13px]">{review.title}</span>
                  {review.verified ? (
                    <span className="border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-300">
                      Verified
                    </span>
                  ) : (
                    <span className="border border-brass/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brass">
                      Client submitted
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
                  {review.body}
                </p>
                <p className="mt-2 text-[11.5px] text-ink-300">
                  {review.author} · {review.location || "—"} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Link
                  href={`/products/${productSlug}`}
                  className="link-underline max-w-[220px] truncate text-right text-[11.5px] uppercase tracking-[0.14em] text-ink-300"
                >
                  {productName}
                </Link>
                <form action={deleteReviewAction}>
                  <input type="hidden" name="id" value={review.id} />
                  <input type="hidden" name="productId" value={review.productId} />
                  <SubmitButton
                    label="Delete"
                    pendingLabel="Deleting"
                    className="border border-ember/50 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-bone"
                  />
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
