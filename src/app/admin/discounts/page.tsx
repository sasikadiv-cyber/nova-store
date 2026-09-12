import { asc, desc } from "drizzle-orm";

import { db } from "@/db";
import { collections, discountCodes, products } from "@/db/schema";
import { codeStatus, describeCode } from "@/lib/discounts";
import {
  deleteDiscountAction,
  saveDiscountAction,
  toggleDiscountAction,
} from "../actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireManagerPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

const SCOPES = [
  { value: "all", label: "Entire store" },
  { value: "category", label: "One category" },
  { value: "collection", label: "One collection" },
  { value: "product", label: "A single product" },
];

export default async function AdminDiscounts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManagerPage();
  const params = await searchParams;

  const [codes, categories, collectionRows, productRows] = await Promise.all([
    db.select().from(discountCodes).orderBy(desc(discountCodes.active), asc(discountCodes.code)),
    db.selectDistinct({ category: products.category }).from(products).orderBy(products.category),
    db.select().from(collections).orderBy(asc(collections.sortOrder)),
    db
      .select({ slug: products.slug, name: products.name })
      .from(products)
      .orderBy(asc(products.name)),
  ]);

  const now = new Date();
  const activeCount = codes.filter((code) => codeStatus(code, now) === "active").length;
  const redemptions = codes.reduce((total, code) => total + code.redeemedCount, 0);

  return (
    <div>
      <p className="eyebrow text-sage">Promotions</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Discount codes</h1>
      <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-300">
        Codes are validated on the server when a client applies one in the bag, and again when the
        order is written — so a switched-off or expired code can never be used.
      </p>

      <div className="mt-8 grid gap-px border border-sand bg-sand sm:grid-cols-3">
        {[
          { value: `${codes.length}`, note: "codes created" },
          { value: `${activeCount}`, note: "currently active" },
          { value: `${redemptions}`, note: "total redemptions" },
        ].map((item) => (
          <div key={item.note} className="bg-linen p-5">
            <p className="font-display text-3xl leading-none">{item.value}</p>
            <p className="eyebrow mt-2.5 text-[9.5px] text-ink-300">{item.note}</p>
          </div>
        ))}
      </div>

      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          Code saved — clients can use it immediately.
        </p>
      )}
      {params.deleted && (
        <p className="mt-6 border-l-2 border-ember bg-linen px-4 py-3 text-[13px]">
          Code deleted.
        </p>
      )}

      {/* ------------------------------------------------------------ codes */}
      <section className="mt-8 overflow-x-auto border border-sand bg-linen">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-sand text-[10.5px] uppercase tracking-[0.14em] text-ink-300">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-3 py-3 font-medium">Reward</th>
              <th className="px-3 py-3 font-medium">Applies to</th>
              <th className="px-3 py-3 font-medium">Conditions</th>
              <th className="px-3 py-3 font-medium">Usage</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Manage</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => {
              const status = codeStatus(code, now);
              return (
                <tr key={code.id} className="border-b border-sand/70 align-top">
                  <td className="px-4 py-4">
                    <p className="font-mono text-[13.5px] tracking-[0.08em]">{code.code}</p>
                    {code.label && <p className="mt-1 text-[11.5px] text-ink-300">{code.label}</p>}
                  </td>
                  <td className="px-3 py-4">
                    {code.type === "percent" ? `${code.value}% off` : `$${(code.value / 100).toFixed(2)} off`}
                  </td>
                  <td className="px-3 py-4 text-ink-500">
                    {code.scope === "all" ? "Entire store" : code.scopeValue}
                  </td>
                  <td className="px-3 py-4 text-[12px] text-ink-300">
                    {code.minSubtotalCents > 0 && <p>Min spend ${code.minSubtotalCents / 100}</p>}
                    {code.maxRedemptions !== null && (
                      <p>Limit {code.maxRedemptions} uses</p>
                    )}
                    {code.startsAt && (
                      <p>From {new Date(code.startsAt).toLocaleDateString("en-GB")}</p>
                    )}
                    {code.endsAt && (
                      <p>Until {new Date(code.endsAt).toLocaleDateString("en-GB")}</p>
                    )}
                    {code.minSubtotalCents === 0 && code.maxRedemptions === null && !code.startsAt && !code.endsAt && (
                      <p>No conditions</p>
                    )}
                  </td>
                  <td className="px-3 py-4 tabular-nums">
                    {code.redeemedCount}
                    {code.maxRedemptions !== null ? ` / ${code.maxRedemptions}` : ""}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em] ${
                        status === "active"
                          ? "bg-ok text-bone"
                          : status === "inactive"
                            ? "bg-sand text-ink-500"
                            : "border border-ink/15 text-ink-300"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col items-end gap-2">
                      <form action={toggleDiscountAction}>
                        <input type="hidden" name="id" value={code.id} />
                        <SubmitButton
                          label={code.active ? "Deactivate" : "Activate"}
                          pendingLabel="Updating"
                          className={`border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                            code.active
                              ? "border-ink/15 text-ink-500 hover:bg-ink hover:text-bone"
                              : "border-ink bg-ink text-bone hover:bg-ink-700"
                          }`}
                        />
                      </form>
                      <form action={deleteDiscountAction}>
                        <input type="hidden" name="id" value={code.id} />
                        <SubmitButton
                          label="Delete"
                          pendingLabel="Deleting"
                          className="border border-ember/50 px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-bone"
                        />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {codes.length === 0 && (
          <p className="px-5 py-14 text-center text-[13.5px] text-ink-300">
            No codes yet — create your first one below.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------- new / edit */}
      <section className="mt-8 border border-sand bg-linen p-6">
        <h2 className="text-2xl">Create a code</h2>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-300">
          Percent codes take 1–70% off. Fixed codes take a dollar amount off. Scope decides which
          pieces in the bag qualify, and every condition is enforced server-side.
        </p>

        <form action={saveDiscountAction} className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className={label}>Code</span>
            <input
              name="code"
              placeholder="NOVAWELCOME (leave blank to auto-generate)"
              className={`${field} font-mono uppercase`}
            />
          </label>
          <label className="block">
            <span className={label}>Label (internal note)</span>
            <input name="label" placeholder="Autumn campaign" className={field} />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Type</span>
              <select name="type" defaultValue="percent" className={field}>
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>Value</span>
              <input name="value" type="number" min={1} step="0.01" defaultValue={10} className={field} />
              <span className="mt-1 block text-[11px] text-ink-300">
                Percent (1–70) or dollars
              </span>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Applies to</span>
              <select name="scope" defaultValue="all" className={field}>
                {SCOPES.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Category / collection / product</span>
              <input name="scopeValue" placeholder="Footwear" list="scope-options" className={field} />
              <datalist id="scope-options">
                {categories.map((row) => (
                  <option key={row.category} value={row.category} />
                ))}
                {collectionRows.map((row) => (
                  <option key={row.slug} value={row.slug} />
                ))}
                {productRows.map((row) => (
                  <option key={row.slug} value={row.slug} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Minimum spend (USD)</span>
              <input name="minSubtotal" type="number" min={0} step="0.01" defaultValue={0} className={field} />
            </label>
            <label className="block">
              <span className={label}>Max redemptions</span>
              <input
                name="maxRedemptions"
                type="number"
                min={0}
                defaultValue={0}
                placeholder="0 = unlimited"
                className={field}
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Starts</span>
              <input name="startsAt" type="datetime-local" className={field} />
            </label>
            <label className="block">
              <span className={label}>Ends</span>
              <input name="endsAt" type="datetime-local" className={field} />
            </label>
          </div>

          <label className="flex items-center gap-3 text-[13.5px] lg:col-span-2">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-ink" />
            Activate immediately
          </label>

          <div className="lg:col-span-2">
            <SubmitButton
              label="Create code"
              pendingLabel="Creating code"
              className="bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
            />
          </div>
        </form>

        {codes.length > 0 && (
          <div className="mt-8 border-t border-sand pt-6">
            <h3 className="text-xl">Live codes at a glance</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {codes
                .filter((code) => codeStatus(code, now) === "active")
                .map((code) => (
                  <li key={code.id} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="font-mono tracking-[0.08em]">{code.code}</span>
                    <span className="text-ink-300">{describeCode(code)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
