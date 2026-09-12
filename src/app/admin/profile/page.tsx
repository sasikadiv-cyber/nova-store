import { getCurrentAdmin } from "@/lib/auth";

import { updateOwnAdminProfileAction } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

export default async function AdminProfile({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await getCurrentAdmin();
  const feedback = await searchParams;
  if (!admin) return null;

  const roleLabel =
    admin.role === "owner" ? "Store owner" : admin.role === "support" ? "Client support" : "Stock manager";

  return (
    <div className="space-y-8">
      <header className="border-b border-sand pb-6">
        <p className="eyebrow text-sage">Your account</p>
        <h1 className="mt-2 text-3xl">Profile</h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
          You are signed in to the console as <span className="text-ink">{roleLabel.toLowerCase()}</span>.
        </p>
      </header>

      {feedback.saved && (
        <p className="border-l-2 border-ok bg-sage-tint px-5 py-4 text-[13.5px] text-ok">
          Your details have been updated.
        </p>
      )}
      {feedback.error && (
        <p className="border-l-2 border-ember bg-bone px-5 py-4 text-[13.5px] text-ember">
          {decodeURIComponent(feedback.error.replace(/\+/g, " "))}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="border border-sand bg-linen p-6 md:p-8">
          <p className="eyebrow text-ink-300">Details</p>
          <dl className="mt-6 space-y-5">
            {[
              { label: "Name", value: admin.name },
              { label: "Email", value: admin.email },
              { label: "Role", value: roleLabel },
              {
                label: "Access",
                value:
                  admin.role === "owner"
                    ? "Everything in the console"
                    : admin.role === "support"
                      ? "Dashboard, orders, reviews and messages"
                      : "Catalogue, stock, orders and messages",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-sand pb-4 last:border-b-0"
              >
                <dt className="text-[12px] uppercase tracking-[0.14em] text-ink-300">{row.label}</dt>
                <dd className="text-[14px]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border border-sand bg-linen p-6 md:p-8">
          {admin.role === "owner" ? (
            <>
              <p className="eyebrow text-ink-300">Password &amp; sign-in</p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-500">
                The owner email and password are set in your environment as{" "}
                <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code>. Rotate them there — they are
                never stored in the database.
              </p>
            </>
          ) : (
            <form action={updateOwnAdminProfileAction} className="space-y-5">
              <p className="eyebrow text-ink-300">Edit your details</p>

              <label className="block">
                <span className={label}>Name</span>
                <input name="name" defaultValue={admin.name} required minLength={2} className={field} />
              </label>

              <label className="block">
                <span className={label}>Email</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={admin.email}
                  required
                  className={field}
                />
              </label>

              <label className="block">
                <span className={label}>Current password — to change your password</span>
                <input name="currentPassword" type="password" className={field} placeholder="••••••••" />
              </label>

              <label className="block">
                <span className={label}>New password (leave blank to keep)</span>
                <input name="newPassword" type="password" minLength={8} className={field} placeholder="••••••••" />
              </label>

              <button
                type="submit"
                className="bg-ink px-8 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
              >
                Save my details
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
