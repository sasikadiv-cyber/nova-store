import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="eyebrow text-ink-300">Error 404</p>
      <h1 className="display-xl text-[clamp(2.6rem,7vw,4.5rem)]">
        This piece has
        <span className="italic text-brass"> sold out</span>
      </h1>
      <p className="text-[14.5px] leading-relaxed text-ink-300">
        The page you were looking for isn&apos;t here. Our runs are small, so pieces do disappear —
        but there is plenty more in the current season.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/shop"
          className="bg-ink px-9 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
        >
          Shop the collection
        </Link>
        <Link href="/" className="link-underline text-[11.5px] uppercase tracking-[0.18em] text-ink-300">
          Back to home
        </Link>
      </div>
    </div>
  );
}
