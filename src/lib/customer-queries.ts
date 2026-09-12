import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  orderEvents,
  orderItems,
  orders,
  paymentMethods,
  products,
  reviews,
  customers,
  type Customer,
  type Order,
  type OrderEvent,
  type OrderItem,
  type PaymentMethod,
  type Review,
} from "@/db/schema";
import { hashPassword } from "./customer-auth";
import { withDbRetry } from "./db-retry";
import { DEMO_CUSTOMER } from "./demo-account";

export const ORDER_FLOW = [
  { id: "confirmed", label: "Order confirmed", blurb: "We have your order and payment." },
  { id: "packed", label: "Packed at the atelier", blurb: "Wrapped and labelled, ready to leave." },
  { id: "shipped", label: "Shipped", blurb: "Handed to the courier for international delivery." },
  { id: "in_transit", label: "In transit", blurb: "Moving through the network towards you." },
  { id: "out_for_delivery", label: "Out for delivery", blurb: "On the van — with you today." },
  { id: "delivered", label: "Delivered", blurb: "Signed for at your address." },
] as const;

export const ORDER_STATUSES = [...ORDER_FLOW.map((s) => s.id), "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function statusLabel(status: string) {
  return ORDER_FLOW.find((step) => step.id === status)?.label ?? status;
}

export function statusIndex(status: string) {
  const index = ORDER_FLOW.findIndex((step) => step.id === status);
  return index === -1 ? 0 : index;
}

export type CustomerOrder = {
  order: Order;
  items: OrderItem[];
  events: OrderEvent[];
};

/** Orders belonging to one customer, newest first, with items and events. */
export async function getCustomerOrders(customerId: number): Promise<CustomerOrder[]> {
  const rows = await withDbRetry(() =>
    db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(60),
  );

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [items, events] = await withDbRetry(() =>
    Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
      db.select().from(orderEvents).where(inArray(orderEvents.orderId, ids)).orderBy(orderEvents.createdAt),
    ]),
  );

  return rows.map((order) => ({
    order,
    items: items.filter((item) => item.orderId === order.id),
    events: events.filter((event) => event.orderId === order.id),
  }));
}

export async function getCustomerOrder(
  customerId: number,
  orderId: number,
): Promise<CustomerOrder | null> {
  const [order] = await withDbRetry(() =>
    db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .limit(1),
  );
  if (!order) return null;

  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(orderEvents.createdAt),
  ]);

  return { order, items, events };
}

/** Orders still on their way to the customer. */
export function isActive(order: Order) {
  return !["delivered", "cancelled", "refunded"].includes(order.status);
}

export async function getCustomerReviews(customerId: number) {
  return db
    .select({
      review: reviews,
      productName: products.name,
      productSlug: products.slug,
      productImage: sql<string>`${products.images}->>0`,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.customerId, customerId))
    .orderBy(desc(reviews.createdAt));
}

export async function getPaymentMethods(customerId: number): Promise<PaymentMethod[]> {
  return db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.customerId, customerId))
    .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
}

export async function getCustomerStats(customerId: number) {
  const [row] = await db
    .select({
      orders: sql<number>`cast(count(*) as int)`,
      spent: sql<number>`cast(coalesce(sum(${orders.totalCents}), 0) as int)`,
      active: sql<number>`cast(count(*) filter (where ${orders.status} not in ('delivered','cancelled','refunded')) as int)`,
      delivered: sql<number>`cast(count(*) filter (where ${orders.status} = 'delivered') as int)`,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId));

  const [reviewRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(reviews)
    .where(eq(reviews.customerId, customerId));

  return {
    orders: row?.orders ?? 0,
    spentCents: row?.spent ?? 0,
    active: row?.active ?? 0,
    delivered: row?.delivered ?? 0,
    reviews: reviewRow?.count ?? 0,
  };
}

/* ------------------------------------------------------------ demo account */

export { DEMO_CUSTOMER } from "./demo-account";

let demoPromise: Promise<void> | null = null;

/**
 * Seeds one demo client with a couple of orders, saved cards and reviews so
 * the account area is explorable straight away. Idempotent.
 */
export async function ensureDemoCustomer() {
  if (!demoPromise) {
    demoPromise = (async () => {
      try {
        const [existing] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, DEMO_CUSTOMER.email))
          .limit(1);
        if (existing) return;

        const [customer] = await db
          .insert(customers)
          .values({
            email: DEMO_CUSTOMER.email,
            passwordHash: hashPassword(DEMO_CUSTOMER.password),
            fullName: DEMO_CUSTOMER.fullName,
            phone: "+33 6 12 34 56 78",
            defaultAddress1: "18 Rue de Turenne",
            defaultCity: "Paris",
            defaultRegion: "Île-de-France",
            defaultPostalCode: "75003",
            defaultCountry: "France",
          })
          .returning();

        await db.insert(paymentMethods).values([
          { customerId: customer.id, brand: "Visa", last4: "4242", expMonth: 8, expYear: 2029, isDefault: true },
          { customerId: customer.id, brand: "Amex", last4: "0057", expMonth: 3, expYear: 2028 },
        ]);

        const catalogue = await db
          .select()
          .from(products)
          .orderBy(products.id)
          .limit(6);

        const plan = [
          { status: "delivered", days: 46, tracking: "DHL-7742019A", method: "standard" },
          { status: "in_transit", days: 3, tracking: "DHL-8891037B", method: "express" },
          { status: "confirmed", days: 0, tracking: "", method: "priority" },
        ];

        for (let i = 0; i < plan.length; i += 1) {
          const step = plan[i];
          const picked = catalogue.slice(i * 2, i * 2 + 2);
          const lines = picked.map((product, index) => ({
            orderId: 0,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.images[0] ?? "",
            size: product.sizes[Math.min(1, index)] ?? product.sizes[0],
            color: product.colors[0]?.name ?? "",
            quantity: 1,
            unitPriceCents: product.priceCents,
            lineTotalCents: product.priceCents,
          }));

          const subtotal = lines.reduce((total, line) => total + line.lineTotalCents, 0);
          const created = new Date(Date.now() - step.days * 864e5);

          const [order] = await db
            .insert(orders)
            .values({
              orderNumber: `NVA-DM${100 + i}`,
              email: customer.email,
              fullName: customer.fullName,
              address1: "18 Rue de Turenne",
              city: "Paris",
              region: "Île-de-France",
              postalCode: "75003",
              country: "France",
              phone: "+33 6 12 34 56 78",
              shippingMethod: step.method,
              customerId: customer.id,
              trackingNumber: step.tracking,
              subtotalCents: subtotal,
              shippingCents: i === 0 ? 1800 : 0,
              totalCents: subtotal + (i === 0 ? 1800 : 0),
              status: step.status,
              createdAt: created,
            })
            .returning();

          await db.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));

          // Walk the timeline up to the current status so tracking looks real.
          const upto = ORDER_FLOW.findIndex((s) => s.id === step.status);
          const steps = upto === -1 ? ORDER_FLOW.slice(0, 1) : ORDER_FLOW.slice(0, upto + 1);
          await db.insert(orderEvents).values(
            steps.map((s, index) => ({
              orderId: order.id,
              status: s.id,
              note: s.blurb,
              createdAt: new Date(created.getTime() + index * 14 * 36e5),
            })),
          );

          if (step.status === "delivered" && picked[0]) {
            await db.insert(reviews).values({
              productId: picked[0].id,
              customerId: customer.id,
              author: customer.fullName,
              location: "Paris, FR",
              rating: 5,
              title: "Still wearing it a year on",
              body: "Third order from Nova and the quality has never slipped. Delivery to Paris took three days.",
              verified: true,
              createdAt: new Date(Date.now() - 30 * 864e5),
            });
          }
        }
      } catch (error) {
        console.error("[nova] demo customer seed skipped", error);
        demoPromise = null;
      }
    })();
  }
  return demoPromise;
}

/** Recalculates a product's rating/count after a customer review change. */
export async function resyncProductRating(productId: number) {
  const [agg] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      avg: sql<number>`cast(coalesce(avg(${reviews.rating}), 5) as float)`,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId));

  await db
    .update(products)
    .set({ reviewCount: agg?.count ?? 0, rating: Math.round((agg?.avg ?? 5) * 10) / 10 })
    .where(eq(products.id, productId));
}

export type { Customer, Review };
