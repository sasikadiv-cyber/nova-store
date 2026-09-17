import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  contactMessages,
  orderEvents,
  orderItems,
  orders,
  products,
  reviews,
} from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { statusLabel } from "@/lib/customer-queries";
import { formatUsd } from "@/lib/currency";
import { isDispatchTracking } from "@/lib/tracking";

export const dynamic = "force-dynamic";

/* Private, per-session content — never cacheable anywhere. */
const NO_STORE = { "Cache-Control": "no-store" } as const;

export type NotificationItem = {
  id: string;
  kind: "order" | "review" | "message" | "delivery";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
  /** Needs the owner/client to actually do something. */
  actionable: boolean;
};

const DAY = 86_400_000;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Activity feed for the console and the client account.
 *
 * Every entry is derived from a row that really exists — orders, order
 * events, reviews and contact messages — and carries that row's own detail
 * (what was bought, what it cost, who wrote it, where the parcel is). There
 * is no second copy of anything to fall out of sync, and nothing is
 * fabricated: an empty store produces an empty feed.
 *
 * Read state is the caller's business: the client sends the timestamp it
 * last acknowledged and anything newer is flagged unread.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const kind = url.searchParams.get("kind");
  const since = new Date(Date.now() - days * DAY);

  /* The feed is scoped by where the caller is — the console or the client
     account — never by "an admin cookie happens to exist". One browser often
     holds both sessions (the owner testing their own store), and without an
     explicit scope both areas were shown the same console feed. */
  const scopeParam = url.searchParams.get("scope");
  const requestedScope =
    scopeParam === "admin" || scopeParam === "customer" ? scopeParam : null;

  const admin = requestedScope === "customer" ? null : await getCurrentAdmin();
  const customer =
    requestedScope === "admin" || admin ? null : await getCurrentCustomer();

  if (!admin && !customer) {
    return NextResponse.json({ ok: true, notifications: [], scope: "anonymous" }, { headers: NO_STORE });
  }

  const items: NotificationItem[] = [];

  if (admin) {
    /* ------------------------------------------------- orders placed */
    const recentOrders = await db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, since))
      .orderBy(desc(orders.createdAt))
      .limit(40);

    const orderIds = recentOrders.map((order) => order.id);
    const lines = orderIds.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    for (const order of recentOrders) {
      const mine = lines.filter((line) => line.orderId === order.id);
      const pieces = mine.reduce((count, line) => count + line.quantity, 0);
      /* Name the actual goods, so the owner knows what to pick without
         opening the order. */
      const names = mine.map((line) => line.name);
      const summary =
        names.length === 0
          ? ""
          : names.length <= 2
            ? names.join(" + ")
            : `${names[0]} + ${names.length - 1} more`;

      items.push({
        id: `order-${order.id}`,
        kind: "order",
        title: `${order.orderNumber} · ${formatUsd(order.totalCents)}`,
        detail: [
          order.fullName,
          order.country,
          pieces ? plural(pieces, "piece") : null,
          summary,
          statusLabel(order.status),
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/admin/orders",
        createdAt: order.createdAt.toISOString(),
        /* Paid but not yet dispatched is the owner's queue. */
        actionable: order.status === "confirmed" || order.status === "payment_review",
      });
    }

    /* ------------------------------------------- dispatch milestones */
    const events = orderIds.length
      ? await db
          .select()
          .from(orderEvents)
          .where(
            and(inArray(orderEvents.orderId, orderIds), gte(orderEvents.createdAt, since)),
          )
          .orderBy(desc(orderEvents.createdAt))
          .limit(60)
      : [];

    for (const event of events) {
      if (event.status !== "shipped" && event.status !== "delivered") continue;
      const order = recentOrders.find((entry) => entry.id === event.orderId);
      if (!order) continue;
      items.push({
        id: `admin-event-${event.id}`,
        kind: "delivery",
        title: `${order.orderNumber} ${statusLabel(event.status).toLowerCase()}`,
        detail: [
          order.fullName,
          isDispatchTracking(order.trackingNumber) ? order.trackingNumber : null,
          event.note,
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/admin/orders",
        createdAt: event.createdAt.toISOString(),
        actionable: false,
      });
    }

    /* ------------------------------------------------ client reviews */
    const recentReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        author: reviews.author,
        location: reviews.location,
        createdAt: reviews.createdAt,
        productName: products.name,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .where(gte(reviews.createdAt, since))
      .orderBy(desc(reviews.createdAt))
      .limit(40);

    for (const review of recentReviews) {
      items.push({
        id: `review-${review.id}`,
        kind: "review",
        title: `${review.rating}★ on ${review.productName ?? "a product"}`,
        detail: [
          review.title,
          review.author,
          review.location,
          review.body.slice(0, 70),
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/admin/reviews",
        createdAt: review.createdAt.toISOString(),
        /* Low scores deserve a reply. */
        actionable: review.rating <= 3,
      });
    }

    /* ----------------------------------------------- client messages */
    const recentMessages = await db
      .select()
      .from(contactMessages)
      .where(gte(contactMessages.createdAt, since))
      .orderBy(desc(contactMessages.createdAt))
      .limit(40);

    for (const message of recentMessages) {
      items.push({
        id: `message-${message.id}`,
        kind: "message",
        title: message.subject || `Message from ${message.name}`,
        detail: [
          message.name,
          message.email,
          message.message.slice(0, 80),
          message.handled ? "Handled" : "Awaiting reply",
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/admin/messages",
        createdAt: message.createdAt.toISOString(),
        actionable: !message.handled,
      });
    }
  } else if (customer) {
    const myOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.customerId, customer.id), gte(orders.createdAt, since)))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    const ids = myOrders.map((order) => order.id);
    const lines = ids.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
      : [];

    /* Which of their own pieces the client has already written about, so a
       review prompt is never shown twice. */
    const written = ids.length
      ? await db
          .select({ productId: reviews.productId })
          .from(reviews)
          .where(eq(reviews.customerId, customer.id))
      : [];
    const reviewed = new Set(written.map((row) => row.productId));

    const events = ids.length
      ? await db
          .select()
          .from(orderEvents)
          .where(and(inArray(orderEvents.orderId, ids), gte(orderEvents.createdAt, since)))
          .orderBy(desc(orderEvents.createdAt))
          .limit(60)
      : [];

    for (const event of events) {
      const order = myOrders.find((entry) => entry.id === event.orderId);
      if (!order) continue;
      const shipped = event.status === "shipped" || event.status === "delivered";
      items.push({
        id: `event-${event.id}`,
        kind: "delivery",
        title: `${order.orderNumber} — ${statusLabel(event.status)}`,
        detail: [
          event.note,
          shipped && isDispatchTracking(order.trackingNumber)
            ? `Tracking ${order.trackingNumber}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/account/orders/${order.id}`,
        createdAt: event.createdAt.toISOString(),
        actionable: false,
      });
    }

    /* Order receipts, with what was actually bought. */
    for (const order of myOrders) {
      const mine = lines.filter((line) => line.orderId === order.id);
      const pieces = mine.reduce((count, line) => count + line.quantity, 0);
      items.push({
        id: `my-order-${order.id}`,
        kind: "order",
        title: `${order.orderNumber} · ${formatUsd(order.totalCents)}`,
        detail: [
          pieces ? plural(pieces, "piece") : null,
          mine[0]?.name,
          statusLabel(order.status),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/account/orders/${order.id}`,
        createdAt: order.createdAt.toISOString(),
        actionable: false,
      });
    }

    /* Review prompts — only for delivered pieces still unreviewed. */
    for (const order of myOrders) {
      if (order.status !== "delivered") continue;
      const pending = lines.filter(
        (line) => line.orderId === order.id && !reviewed.has(line.productId),
      );
      if (pending.length === 0) continue;

      const latest = events.find(
        (event) => event.orderId === order.id && event.status === "delivered",
      );

      items.push({
        id: `review-prompt-${order.id}`,
        kind: "review",
        title: `Review your ${pending[0].name}`,
        detail:
          pending.length > 1
            ? `${order.orderNumber} delivered · ${plural(pending.length, "piece")} awaiting your review`
            : `${order.orderNumber} delivered · tell other clients what you thought`,
        href: `/account/orders/${order.id}`,
        createdAt: (latest?.createdAt ?? order.createdAt).toISOString(),
        actionable: true,
      });
    }
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const scoped = kind && kind !== "all" ? items.filter((item) => item.kind === kind) : items;

  return NextResponse.json(
    {
      ok: true,
      notifications: scoped.slice(0, 60),
      scope: admin ? "admin" : "customer",
      /* Lets the client mark everything currently visible as read. */
      newestAt: items[0]?.createdAt ?? null,
    },
    { headers: NO_STORE },
  );
}
