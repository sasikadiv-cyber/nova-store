import { and, eq, like, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { parseProductForm } from "@/lib/product-form";

export const dynamic = "force-dynamic";

/**
 * Creates or updates a product from the admin form.
 *
 * This is a plain route handler rather than a server action on purpose: it
 * keeps the write path independent of the build-time action registry, so
 * editing works identically on every build.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Shop owner access only." }, { status: 401 });
  }

  // Same-origin guard (the form is same-origin only).
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ ok: false, error: "Cross-origin request blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read the form." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseProductForm(form);
  } catch (error) {
    console.error("[nova] could not read the product form", error);
    return NextResponse.json(
      { ok: false, error: "Could not read the form — check the image links and colours." },
      { status: 400 },
    );
  }

  const { id, values } = parsed;

  if (values.priceCents <= 0) {
    return NextResponse.json({ ok: false, error: "Enter a price above zero." }, { status: 400 });
  }
  if (!values.name.trim()) {
    return NextResponse.json({ ok: false, error: "Enter a product name." }, { status: 400 });
  }

  try {
    if (id > 0) {
      /* Editing: keep the existing slug when the form produced nothing usable,
         and refuse a slug that another product already owns. */
      const [current] = await db
        .select({ slug: products.slug })
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!current) {
        return NextResponse.json(
          { ok: false, error: "That product no longer exists." },
          { status: 404 },
        );
      }

      values.slug = values.slug || current.slug;

      if (values.slug !== current.slug) {
        const [clash] = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.slug, values.slug), ne(products.id, id)))
          .limit(1);
        if (clash) {
          return NextResponse.json(
            { ok: false, error: `The slug "${values.slug}" is already used by another product.` },
            { status: 409 },
          );
        }
      }

      await db.update(products).set(values).where(eq(products.id, id));
    } else {
      /* Creating: never fail on a slug clash — pick the next free one. */
      values.slug = await nextAvailableSlug(values.slug);
      await db.insert(products).values(values);
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id: id > 0 ? id : null, slug: values.slug });
  } catch (error) {
    const causedBy = (error as { cause?: { message?: string } })?.cause?.message ?? "";
    const detail = `${error instanceof Error ? error.message : ""} ${causedBy}`;
    console.error("[nova] admin product save failed", error);

    if (/duplicate key|unique constraint/i.test(detail)) {
      return NextResponse.json(
        { ok: false, error: `The slug "${values.slug}" is already used by another product.` },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not save this product.",
        detail: detail.trim().slice(0, 240) || undefined,
      },
      { status: 500 },
    );
  }
}

/** Returns a slug that is free, appending -2, -3… when needed. */
async function nextAvailableSlug(preferred: string) {
  const base =
    preferred ||
    `piece-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;

  const taken = new Set(
    (
      await db
        .select({ slug: products.slug })
        .from(products)
        .where(like(products.slug, `${base}%`))
    ).map((row) => row.slug),
  );

  if (!taken.has(base)) return base;

  for (let index = 2; index < 60; index += 1) {
    if (!taken.has(`${base}-${index}`)) return `${base}-${index}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
