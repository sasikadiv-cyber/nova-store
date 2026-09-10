import { NextResponse } from "next/server";

import { ensureVariants, getVariants, toStockView } from "@/lib/variants";

export const dynamic = "force-dynamic";

/** Public availability for one product, per colour and size. */
export async function GET(request: Request) {
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
  }

  try {
    await ensureVariants(productId);
    const variants = toStockView(await getVariants(productId));
    return NextResponse.json({ ok: true, variants });
  } catch (error) {
    console.error("[nova] variant fetch failed", error);
    return NextResponse.json({ ok: false, error: "Could not load availability." }, { status: 500 });
  }
}
