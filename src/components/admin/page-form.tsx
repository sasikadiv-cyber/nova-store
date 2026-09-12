"use client";

import { useState } from "react";

import { saveSitePageAction } from "@/app/admin/actions";
import type { PageBlock } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

/** Edits one informational page: the header copy plus any number of sections. */
export function PageForm({
  slug,
  title,
  eyebrow,
  intro,
  blocks,
  published,
}: {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  blocks: PageBlock[];
  published: boolean;
}) {
  const [sections, setSections] = useState<PageBlock[]>(
    blocks.length > 0 ? blocks : [{ heading: "", body: [] }],
  );

  function update(index: number, patch: Partial<PageBlock>) {
    setSections((current) =>
      current.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)),
    );
  }

  return (
    <form action={saveSitePageAction} className="space-y-7">
      <input type="hidden" name="slug" value={slug} />

      <div className="border border-sand bg-linen p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className={label}>Page title</span>
            <input name="title" defaultValue={title} required className={field} />
          </label>
          <label className="block">
            <span className={label}>Eyebrow</span>
            <input name="eyebrow" defaultValue={eyebrow} className={field} />
          </label>
        </div>

        <label className="mt-6 block">
          <span className={label}>Intro paragraph</span>
          <textarea name="intro" defaultValue={intro} rows={3} className={`${field} resize-none`} />
        </label>

        <label className="mt-6 flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={published}
            className="h-4 w-4 accent-ink"
          />
          <span className="text-[13px]">Published — visible on the storefront</span>
        </label>
      </div>

      <div className="space-y-5">
        <p className="eyebrow text-ink-300">Sections</p>

        {sections.map((block, index) => (
          <div key={index} className="border border-sand bg-linen p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] uppercase tracking-[0.14em] text-ink-300">
                Section {index + 1}
              </p>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSections((current) => current.filter((_, i) => i !== index))}
                  className="text-[11px] uppercase tracking-[0.14em] text-ink-300 transition-colors hover:text-ember"
                >
                  Remove
                </button>
              )}
            </div>

            <label className="mt-4 block">
              <span className={label}>Heading</span>
              <input
                name="block_heading"
                value={block.heading}
                onChange={(event) => update(index, { heading: event.target.value })}
                className={field}
                placeholder="The window"
              />
            </label>

            <label className="mt-5 block">
              <span className={label}>Body — one paragraph per line</span>
              <textarea
                name="block_body"
                value={block.body.join("\n")}
                onChange={(event) => update(index, { body: event.target.value.split("\n") })}
                rows={5}
                className={`${field} resize-y`}
              />
            </label>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setSections((current) => [...current, { heading: "", body: [] }])}
          className="border border-ink/20 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-ink"
        >
          Add section
        </button>
      </div>

      <div className="flex items-center gap-4 border-t border-sand pt-6">
        <SubmitButton
          label="Save page"
          pendingLabel="Saving"
          className="bg-ink px-9 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
        />
        <p className="text-[12px] text-ink-300">Changes appear on the storefront immediately.</p>
      </div>
    </form>
  );
}
