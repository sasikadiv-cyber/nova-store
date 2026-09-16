/** Route-level loading skeleton with a realtime feel while data streams in. */
export function RouteLoading({
  title = "Loading…",
  note,
}: {
  title?: string;
  note?: string;
}) {
  return (
    <div className="animate-fade-up space-y-8">
      <div className="border-b border-sand pb-6">
        <div className="h-3 w-28 animate-pulse bg-sand" />
        <div className="mt-4 h-8 w-56 animate-pulse bg-sand" />
        {note && <p className="mt-3 text-[13.5px] text-ink-300">{note}</p>}
      </div>

      <div className="flex items-center gap-3 border border-sand bg-linen px-5 py-4">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-ink/40 border-t-transparent" />
        <span className="text-[13px] text-ink-500">{title}</span>
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 border border-sand bg-linen p-4">
            <div className="h-14 w-11 shrink-0 animate-pulse bg-bone-dark" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse bg-sand" />
              <div className="h-3 w-1/3 animate-pulse bg-sand" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
