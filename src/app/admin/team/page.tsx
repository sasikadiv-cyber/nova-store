import { desc } from "drizzle-orm";

import { SubmitButton } from "@/components/admin/submit-button";
import { TeamMemberEditor } from "@/components/admin/team-member-editor";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { OWNER_EMAIL } from "@/lib/auth";

import { createStockManagerAction } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

const ROLE_LABEL: Record<string, string> = {
  stock_manager: "Stock manager",
  support: "Client support",
};

export default async function AdminTeam({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string; reset?: string; error?: string; role?: string }>;
}) {
  const feedback = await searchParams;
  const members = await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt)).limit(100);

  return (
    <div className="space-y-8">
      <header className="border-b border-sand pb-6">
        <p className="eyebrow text-sage">Store owner</p>
        <h1 className="mt-2 text-3xl">Team &amp; access</h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-300">
          You are signed in as the store owner. Stock managers run the catalogue, stock, gift cards
          and discounts. Client support sees the dashboard, orders, reviews and messages only.
          Nobody but you reaches the storefront appearance, pages, pricing or this screen.
        </p>
      </header>

      {feedback.created && (
        <p className="border-l-2 border-ok bg-sage-tint px-5 py-4 text-[13.5px] text-ok">
          <span className="font-medium">{feedback.created}</span> now has console access as{" "}
          {ROLE_LABEL[feedback.role ?? "stock_manager"]}. They can sign in and change their own
          password from their profile.
        </p>
      )}
      {feedback.saved && (
        <p className="border-l-2 border-ok bg-sage-tint px-5 py-4 text-[13.5px] text-ok">
          <span className="font-medium">{feedback.saved}</span> has been updated.
        </p>
      )}
      {feedback.error && (
        <p className="border-l-2 border-ember bg-bone px-5 py-4 text-[13.5px] text-ember">
          {decodeURIComponent(feedback.error.replace(/\+/g, " "))}
        </p>
      )}

      <div className="border border-sand bg-linen px-6 py-5">
        <p className="eyebrow text-ink-300">Store owner</p>
        <p className="mt-2 text-[14.5px]">{OWNER_EMAIL}</p>
        <p className="mt-1 text-[12px] text-ink-300">
          Full access · credentials live in the environment as ADMIN_EMAIL and ADMIN_PASSWORD ·
          never stored in the database
        </p>
      </div>

      <form action={createStockManagerAction} className="border border-sand bg-linen p-6 md:p-8">
        <p className="eyebrow text-ink-300">Give a team member access</p>
        <div className="mt-5 grid gap-6 md:grid-cols-4">
          <label className="block">
            <span className={label}>Name</span>
            <input name="name" required minLength={2} className={field} placeholder="Maya Fernando" />
          </label>
          <label className="block">
            <span className={label}>Email</span>
            <input name="email" type="email" required className={field} placeholder="maya@nova.com" />
          </label>
          <label className="block">
            <span className={label}>Password (min 8 characters)</span>
            <input name="password" type="password" required minLength={8} className={field} placeholder="••••••••" />
          </label>
          <label className="block">
            <span className={label}>Role</span>
            <select name="role" defaultValue="stock_manager" className={field}>
              <option value="stock_manager" className="text-ink">
                Stock manager — catalogue &amp; stock
              </option>
              <option value="support" className="text-ink">
                Client support — orders &amp; messages
              </option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <SubmitButton
            label="Create account"
            pendingLabel="Creating"
            className="bg-ink px-9 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
          />
          <p className="text-[12px] text-ink-300">
            Passwords are hashed with scrypt before they are written.
          </p>
        </div>
      </form>

      {members.length === 0 ? (
        <div className="border border-dashed border-ink/20 px-6 py-16 text-center">
          <p className="font-display text-2xl">No team accounts yet</p>
          <p className="mt-3 text-[13.5px] text-ink-300">
            Add a team member above to give them console access.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <TeamMemberEditor
              key={member.id}
              member={{
                id: member.id,
                email: member.email,
                name: member.name,
                role: member.role,
                active: member.active,
                lastLoginAt: member.lastLoginAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
