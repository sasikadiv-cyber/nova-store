import { AppearanceForm } from "@/components/admin/appearance-form";
import { getAppearance } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Site appearance" };

export default async function AdminAppearancePage() {
  const appearance = await getAppearance();

  return (
    <div>
      <p className="eyebrow text-sage">Storefront</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)]">Site appearance</h1>
      <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-300">
        The hero film, its poster, the story video and the home page wording. Everything here is
        scoped to the home page — your products, stock and collections are never touched.
      </p>
      <AppearanceForm initial={appearance} />
    </div>
  );
}
