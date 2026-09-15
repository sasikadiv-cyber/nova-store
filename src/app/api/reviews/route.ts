import { NextResponse } from "next/server";

import { guard } from "@/lib/security";

import { createReview } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guard(request, "review", 5, 3600);
  if (blocked) return blocked;

  let payload: {
    slug?: string;
    author?: string;
    location?: string;
    rating?: number;
    title?: string;
    body?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const slug = (payload.slug ?? "").trim();
  const author = (payload.author ?? "").trim();
  const title = (payload.title ?? "").trim();
  const body = (payload.body ?? "").trim();
  const rating = Number(payload.rating ?? 0);

  if (!slug) return NextResponse.json({ ok: false, error: "Missing product." }, { status: 400 });
  if (author.length < 2)
    return NextResponse.json({ ok: false, error: "Please add your name." }, { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ ok: false, error: "Rating must be 1 to 5." }, { status: 400 });
  if (title.length < 3)
    return NextResponse.json({ ok: false, error: "Please add a headline." }, { status: 400 });
  if (body.length < 10)
    return NextResponse.json({ ok: false, error: "Please write a little more." }, { status: 400 });

  try {
    const result = await createReview({
      slug,
      author,
      location: (payload.location ?? "").trim(),
      rating,
      title,
      body,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true, review: result.review });
  } catch (error) {
    console.error("[nova] review failed", error);
    return NextResponse.json({ ok: false, error: "Could not save your review." }, { status: 500 });
  }
}
