"use client";

import { useState } from "react";

import { deleteStockManagerAction, toggleStockManagerAction, updateStockManagerAction } from "@/app/admin/actions";

import { SubmitButton } from "./submit-button";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

const ROLE_LABEL: Record<string, string> = {
  stock_manager: "Stock manager",
  support: "Client support",
};

/**
 * One team account. Read-only until the owner picks up the pencil — so a slip
 * of the cursor can never change a name, role or password by accident.
 */
export function TeamMemberEditor({
  member,
}: {
  member: {
    id: number;
    email: string;
    name: string;
    role: string;
    active: boolean;
    lastLoginAt: string | Date | null;
  };
}) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="border border-sand bg-linen p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14.5px]">
            {member.name}
            <span
              className={`ml-3 inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                member.active ? "bg-sage-tint text-sage" : "bg-bone-dark text-ink-300"
              }`}
            >
              {member.active ? "Active" : "Suspended"}
            </span>
            <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-ink-300">
              {ROLE_LABEL[member.role] ?? "Stock manager"}
            </span>
          </p>
          <p className="mt-1 text-[12px] text-ink-300">
            {member.email} ·{" "}
            {member.lastLoginAt
              ? `last signed in ${new Date(member.lastLoginAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "never signed in"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
              editing ? "bg-ink text-bone hover:bg-ink-700" : "border border-ink/15 hover:border-ink"
            }`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
            </svg>
            {editing ? "Close" : "Edit details"}
          </button>

          <form action={toggleStockManagerAction}>
            <input type="hidden" name="id" value={member.id} />
            <SubmitButton
              label={member.active ? "Suspend" : "Restore"}
              pendingLabel="Working"
              className="border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-ink"
            />
          </form>

          <form action={deleteStockManagerAction}>
            <input type="hidden" name="id" value={member.id} />
            <SubmitButton
              label="Remove"
              pendingLabel="Removing"
              className="border border-ink/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] text-ink-300 transition-colors hover:border-ember hover:text-ember"
            />
          </form>
        </div>
      </div>

      {editing && (
        <form
          action={updateStockManagerAction}
          className="mt-5 grid gap-5 border-t border-sand pt-6 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={member.id} />

          <label className="block">
            <span className={label}>Name</span>
            <input name="name" defaultValue={member.name} required minLength={2} className={field} />
          </label>

          <label className="block">
            <span className={label}>Email</span>
            <input name="email" type="email" defaultValue={member.email} required className={field} />
          </label>

          <label className="block">
            <span className={label}>Role</span>
            <select name="role" defaultValue={member.role} className={field}>
              <option value="stock_manager" className="text-ink">
                Stock manager — catalogue &amp; stock
              </option>
              <option value="support" className="text-ink">
                Client support — orders &amp; messages
              </option>
            </select>
          </label>

          <label className="block">
            <span className={label}>New password (leave blank to keep)</span>
            <input
              name="password"
              type="password"
              minLength={8}
              className={field}
              placeholder="••••••••"
            />
          </label>

          <label className="block md:col-span-2">
            <span className={label}>Your owner password — verification</span>
            <input
              name="ownerPassword"
              type="password"
              required
              className={field}
              placeholder="re-enter to authorise these changes"
            />
            <span className="mt-2 block text-[12px] text-ink-300">
              Required for every edit, so a shared browser can never take over an account.
            </span>
          </label>

          <div className="md:col-span-2">
            <SubmitButton
              label="Save changes"
              pendingLabel="Verifying"
              className="bg-ink px-9 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
            />
          </div>
        </form>
      )}
    </article>
  );
}
