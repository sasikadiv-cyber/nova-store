import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/auth";
import { setVariantStock } from "@/lib/variants";

export const dynamic = "force-dynamic";

type Update = { productId: number; color: string; size: string; stock: number };

/**
 * Writes a whole batch of stock levels in one request, so the owner can change
 * as many cells as they like and commit them together.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Shop owner access only." }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Blocked." }, { status: 403 });
    }
  }

  let payload: { updates?: Update[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const updates = (payload.updates ?? [])
    .map((row) => ({
      productId: Number(row.productId),
      color: String(row.color ?? "").trim(),
      size: String(row.size ?? "").trim(),
      stock: Math.max(0, Math.round(Number(row.stock))),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.productId) &&
        row.productId > 0 &&
        row.color.length > 0 &&
        row.size.length > 0 &&
        Number.isFinite(row.stock),
    )
    .slice(0, 2000);

  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  try {
    /* One product total per distinct product, written after its cells. */
    const seen = new Set<number>();
    for (const row of updates) {
      await setVariantStock(row.productId, row.color, row.size, row.stock);
      seen.add(row.productId);
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/stock");

    return NextResponse.json({ ok: true, updated: updates.length, products: seen.size });
  } catch (error) {
    console.error("[nova] batch stock update failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not save those stock levels." },
      { status: 500 },
    );
  }
}
