import { SubmitButton } from "@/components/admin/submit-button";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { changePasswordAction, updateProfileAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile & address" };

const field =
  "mt-2 w-full border border-ink/15 bg-bone px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-ink";
const label = "eyebrow block text-ink-300";

const COUNTRIES = [
  "Australia", "Canada", "France", "Germany", "Italy", "Japan", "Netherlands",
  "Singapore", "South Korea", "Spain", "Sweden", "United Arab Emirates",
  "United Kingdom", "United States",
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const customer = await getCurrentCustomer();
  if (!customer) return null;

  return (
    <div>
      <p className="eyebrow text-sage">Details</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Profile &amp; address</h1>
      <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-300">
        These details pre-fill your checkout, so a global order takes seconds to place.
      </p>

      {params.error && (
        <p className="mt-6 border-l-2 border-ember bg-linen px-4 py-3 text-[13px] text-ember">
          {params.error}
        </p>
      )}
      {params.saved && (
        <p className="mt-6 border-l-2 border-brass bg-linen px-4 py-3 text-[13px]">
          {params.saved === "password" ? "Password updated." : "Details saved."}
        </p>
      )}

      <section className="mt-8 border border-sand bg-linen p-6">
        <h2 className="text-2xl">Personal details</h2>
        <form action={updateProfileAction} className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Full name</span>
            <input name="fullName" required defaultValue={customer.fullName} className={field} />
          </label>
          <label className="block">
            <span className={label}>Email (sign-in)</span>
            <input value={customer.email} disabled className={`${field} text-ink-300`} />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Phone</span>
            <input name="phone" defaultValue={customer.phone} className={field} />
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Street address</span>
            <input name="address1" defaultValue={customer.defaultAddress1} className={field} />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Apartment, suite (optional)</span>
            <input name="address2" defaultValue={customer.defaultAddress2} className={field} />
          </label>

          <label className="block">
            <span className={label}>City</span>
            <input name="city" defaultValue={customer.defaultCity} className={field} />
          </label>
          <label className="block">
            <span className={label}>State / region</span>
            <input name="region" defaultValue={customer.defaultRegion} className={field} />
          </label>
          <label className="block">
            <span className={label}>Postal code</span>
            <input name="postalCode" defaultValue={customer.defaultPostalCode} className={field} />
          </label>
          <label className="block">
            <span className={label}>Country</span>
            <select
              name="country"
              defaultValue={customer.defaultCountry || "United States"}
              className={field}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <SubmitButton
              label="Save details"
              pendingLabel="Saving"
              className="bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
            />
          </div>
        </form>
      </section>

      <section className="mt-8 border border-sand bg-linen p-6">
        <h2 className="text-2xl">Password</h2>
        <form action={changePasswordAction} className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Current password</span>
            <input name="currentPassword" type="password" required className={field} />
          </label>
          <label className="block">
            <span className={label}>New password</span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className={field}
            />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton
              label="Update password"
              pendingLabel="Updating"
              className="border border-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-bone"
            />
          </div>
        </form>
      </section>
    </div>
  );
}
