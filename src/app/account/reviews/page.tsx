import Image from "next/image";
import Link from "next/link";

import { Stars } from "@/components/ui";
import { SubmitButton } from "@/components/admin/submit-button";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getCustomerReviews } from "@/lib/customer-queries";
import { deleteCustomerReviewAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "My reviews" };

export default async function AccountReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const customer = await getCurrentCustomer();
  if (!customer) return null;

  const rows = await getCustomerReviews(customer.id);

  return (
    <div>
      <p className="eyebrow text-sage">Community</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">My reviews</h1>
      <p className="mt-3 text-[13px] text-ink-300">
        {rows.length} review{rows.length === 1 ? "" : "s"} · removing one updates the product rating
        immediately
      </p>

      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Review removed.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-8 border border-dashed border-sand bg-linen px-5 py-16 text-center">
          <p className="text-[13.5px] text-ink-300">
            You have not reviewed a piece yet. Reviews open on any product page once it has been
            delivered.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block bg-ink px-7 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
          >
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className="mt-8 divide-y divide-sand border-y border-sand">
          {rows.map(({ review, productName, productSlug, productImage }) => (
            <article key={review.id} className="flex flex-wrap items-start gap-4 py-5">
              <Link
                href={`/products/${productSlug}`}
                className="relative h-[92px] w-[70px] shrink-0 overflow-hidden bg-bone-dark"
              >
                <Image src={productImage} alt={productName} fill sizes="70px" className="object-cover" />
              </Link>

              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars rating={review.rating} className="text-brass" size={13} />
                  <span className="text-[14px]">{review.title}</span>
                  {review.verified && (
                    <span className="border border-ink/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-300">
                      Verified purchase
                    </span>
                  )}
                </div>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
                  {review.body}
                </p>
                <p className="mt-2 text-[11.5px] text-ink-300">
                  On {productName} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <form action={deleteCustomerReviewAction} className="shrink-0">
                <input type="hidden" name="id" value={review.id} />
                <SubmitButton
                  label="Delete"
                  pendingLabel="Deleting"
                  className="border border-ember/50 px-4 py-2 text-[10.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-bone"
                />
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
