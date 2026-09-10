"use client";

import { useEffect, useRef, useState } from "react";

import { isImageUrl, parseImageLine, serialiseImageRows, type ImageRow } from "@/lib/image-utils";

type Row = ImageRow;

const isUrl = isImageUrl;

/**
 * Image manager for the product form: an add button per image, a name for each
 * one, a live thumbnail preview, reordering and removal. Serialises to a hidden
 * `images` field as `Label | url` lines (label optional), so the existing
 * write path keeps working.
 */
export function ImageEditor({
  initial,
  name = "images",
}: {
  initial: string;
  name?: string;
}) {
  const seed = initial
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseImageLine);

  const [rows, setRows] = useState<Row[]>(seed.length ? seed : []);
  const [previewUrls, setPreviewUrls] = useState<string[]>(() => seed.map((row) => row.url));
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const nextUrlRef = useRef<HTMLInputElement | null>(null);

  /* Debounce the preview so typing a long URL does not fire a request per key. */
  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewUrls(rows.map((row) => row.url)), 450);
    return () => window.clearTimeout(timer);
  }, [rows]);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) =>
    setRows((current) => current.filter((_, i) => i !== index));

  const move = (index: number, direction: -1 | 1) =>
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addRow = () => {
    setRows((current) => [...current, { label: "", url: "" }]);
    window.setTimeout(() => nextUrlRef.current?.focus(), 30);
  };

  const serialised = serialiseImageRows(rows);

  return (
    <div>
      <input type="hidden" name={name} value={serialised} />

      <ul className="space-y-2.5">
        {rows.map((row, index) => {
          const preview = previewUrls[index] ?? "";
          const showable = isUrl(preview) && !broken[preview];
          return (
            <li key={index} className="flex gap-3 border border-ink/12 bg-bone p-2.5">
              {/* --------------------------------------------- thumbnail */}
              <div className="relative h-[86px] w-[66px] shrink-0 overflow-hidden bg-bone-dark">
                {showable ? (
                  // A plain <img> on purpose: the owner may paste a link from
                  // any host, which next/image would reject.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={row.label || `Image ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={() => setBroken((current) => ({ ...current, [preview]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center">
                    {preview && isUrl(preview) ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-ember">
                          <path d="M4 16l4.5-4.5 3 3L16 10l4 4" />
                          <path d="M3 21h18" />
                        </svg>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-ember">No image</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-ink-300">
                          <rect x="3" y="5" width="18" height="14" rx="1" />
                          <circle cx="9" cy="10" r="1.6" />
                          <path d="M4 17l5-4 3.5 3 3-2.5L20 17" />
                        </svg>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-ink-300">Preview</span>
                      </>
                    )}
                  </div>
                )}
                <span className="absolute bottom-0 left-0 bg-ink/75 px-1.5 py-0.5 text-[9px] tabular-nums text-bone">
                  {index + 1}
                </span>
              </div>

              {/* ------------------------------------------------ inputs */}
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={row.url}
                  onChange={(event) => {
                    update(index, { url: event.target.value });
                    setBroken((current) => ({ ...current, [event.target.value]: false }));
                  }}
                  placeholder="https://… image link"
                  aria-label={`Image ${index + 1} link`}
                  ref={index === rows.length - 1 && !row.url ? nextUrlRef : undefined}
                  className="w-full border border-ink/15 bg-linen px-3 py-2 font-mono text-[12px] outline-none transition-colors focus:border-ink"
                />
                <input
                  value={row.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                  placeholder="Name for this image (e.g. Front view)"
                  aria-label={`Image ${index + 1} name`}
                  className="w-full border border-ink/15 bg-linen px-3 py-2 text-[12.5px] outline-none transition-colors focus:border-ink"
                />
              </div>

              {/* --------------------------------------------- controls */}
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move image up"
                  className="grid h-7 w-7 place-items-center border border-ink/12 text-ink-300 transition-colors hover:border-ink hover:text-ink disabled:opacity-25"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 14l6-6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move image down"
                  className="grid h-7 w-7 place-items-center border border-ink/12 text-ink-300 transition-colors hover:border-ink hover:text-ink disabled:opacity-25"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 10l6 6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="grid h-7 w-7 place-items-center border border-ink/12 text-ink-300 transition-colors hover:border-ember hover:text-ember"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 flex items-center gap-2 border border-dashed border-ink/30 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink hover:bg-ink hover:text-bone"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add image
      </button>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-300">
        {rows.filter((row) => isUrl(row.url)).length} image
        {rows.filter((row) => isUrl(row.url)).length === 1 ? "" : "s"} ready — the first one is used
        as the product card image. Paste any https link; the preview loads as you type.
      </p>
    </div>
  );
}
