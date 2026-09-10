/**
 * Route-level loading state.
 *
 * Deliberately generic: this boundary wraps every route, so it must not assume
 * a product grid (which looked wrong on the account, admin and checkout
 * pages). A neutral editorial skeleton reads correctly everywhere.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-16 md:px-10 md:py-24">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-5 h-12 w-2/3 max-w-xl" />
      <div className="skeleton mt-4 h-3 w-1/2 max-w-md" />

      <div className="mt-12 grid gap-px border border-sand bg-sand sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-linen p-6">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-4 h-8 w-24" />
            <div className="skeleton mt-3 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex gap-4 border border-sand bg-linen p-4">
            <div className="skeleton h-[76px] w-[58px] shrink-0" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-2.5 w-1/2" />
              <div className="skeleton h-2.5 w-2/5" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center gap-3">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink border-t-transparent" />
        <span className="eyebrow text-ink-300">Loading</span>
      </div>
    </div>
  );
}
