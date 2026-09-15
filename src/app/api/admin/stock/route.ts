import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth";
import { ensureVariants, setVariantStock } from "@/lib/variants";

export const dynamic = "force-dynamic";

/** Updates one colour-and-size combination, then resyncs the product total. */
export async function POST(request: Request) {
  await requireManager();

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

  let payload: {
    productId?: number;
    color?: string;
    size?: string;
    stock?: number;
    ensure?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const productId = Number(payload.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
  }

  /* Creates rows for any newly added colour or size before we write. */
  if (payload.ensure) {
    await ensureVariants(productId);
  }

  const color = (payload.color ?? "").trim();
  const size = (payload.size ?? "").trim();

  if (!color || !size) {
    return NextResponse.json({ ok: false, error: "Missing colour or size." }, { status: 400 });
  }

  const stock = Number(payload.stock);
  if (!Number.isFinite(stock) || stock < 0) {
    return NextResponse.json({ ok: false, error: "Enter a stock count of zero or more." }, { status: 400 });
  }

  try {
    await setVariantStock(productId, color, size, stock);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[nova] stock update failed", error);
    return NextResponse.json({ ok: false, error: "Could not save that stock level." }, { status: 500 });
  }
}
