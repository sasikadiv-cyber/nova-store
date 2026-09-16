import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { contactMessages, orderEvents, orders, reviews } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export type NotificationItem = {
  id: string;
  kind: "order" | "review" | "message" | "delivery";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

const DAY = 86_400_000;

/**
 * Activity feed for the console and the client account.
 *
 * Nothing is stored: the feed is derived from the orders, order events,
 * reviews and contact messages that already exist, so there is no second copy
 * of anything to fall out of sync. "Unread" is a browser-side marker, kept in
 * local storage against the newest item the user has seen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const kind = url.searchParams.get("kind");
  const since = new Date(Date.now() - days * DAY);

  const admin = await getCurrentAdmin();
  const customer = admin ? null : await getCurrentCustomer();

  if (!admin && !customer) {
    return NextResponse.json({ ok: true, notifications: [], scope: "anonymous" });
  }

  const items: NotificationItem[] = [];

  if (admin) {
    const recentOrders = await db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, since))
      .orderBy(desc(orders.createdAt))
      .limit(40);

    for (const order of recentOrders) {
      items.push({
        id: `order-${order.id}`,
        kind: "order",
        title: `New order ${order.orderNumber}`,
        detail: `${order.fullName} · ${(order.totalCents / 100).toFixed(2)} USD · ${order.status.replace(/_/g, " ")}`,
        href: "/admin/orders",
        createdAt: order.createdAt.toISOString(),
        unread: order.status === "confirmed",
      });
    }

    const recentReviews = await db
      .select()
      .from(reviews)
      .where(gte(reviews.createdAt, since))
      .orderBy(desc(reviews.createdAt))
      .limit(40);

    for (const review of recentReviews) {
      items.push({
        id: `review-${review.id}`,
        kind: "review",
        title: `New ${review.rating}★ review`,
        detail: `${review.title} — ${review.author}`,
        href: "/admin/reviews",
        createdAt: review.createdAt.toISOString(),
        unread: true,
      });
    }

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
        title: `Message from ${message.name}`,
        detail: message.subject || message.message.slice(0, 80),
        href: "/admin/messages",
        createdAt: message.createdAt.toISOString(),
        unread: !message.handled,
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
    const events =
      ids.length > 0
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
      items.push({
        id: `event-${event.id}`,
        kind: "delivery",
        title: `${order.orderNumber} — ${event.status.replace(/_/g, " ")}`,
        detail: event.note || `Status updated to ${event.status.replace(/_/g, " ")}.`,
        href: `/account/orders/${order.id}`,
        createdAt: event.createdAt.toISOString(),
        unread: event.status === "delivered",
      });
    }

    for (const order of myOrders) {
      if (order.status !== "delivered") continue;
      items.push({
        id: `review-prompt-${order.id}`,
        kind: "review",
        title: "Write a review",
        detail: `${order.orderNumber} was delivered — tell other clients what you thought.`,
        href: `/account/orders/${order.id}`,
        createdAt: order.createdAt.toISOString(),
        unread: true,
      });
    }
  }

  if (kind && kind !== "all") {
    const filtered = items.filter((item) => item.kind === kind);
    return NextResponse.json({
      ok: true,
      notifications: filtered,
      scope: admin ? "admin" : "customer",
    });
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({
    ok: true,
    notifications: items.slice(0, 60),
    scope: admin ? "admin" : "customer",
  });
}
