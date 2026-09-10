import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type ColorOption = {
  name: string;
  hex: string;
  family: string;
};

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  accent: text("accent").notNull().default("#0b0b0c"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    subtitle: text("subtitle").notNull(),
    description: text("description").notNull(),
    story: text("story").notNull().default(""),
    category: text("category").notNull(),
    gender: text("gender").notNull().default("Unisex"),
    collectionSlug: text("collection_slug").notNull().default("elevated-essentials"),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    colors: jsonb("colors").$type<ColorOption[]>().notNull(),
    sizes: jsonb("sizes").$type<string[]>().notNull(),
    sizeType: text("size_type").notNull().default("alpha"),
    images: jsonb("images").$type<string[]>().notNull(),
    /** Optional owner-facing caption per image, parallel to `images`. */
    imageLabels: jsonb("image_labels").$type<string[]>().notNull().default([]),
    /** Images for the "The making of it" section; falls back to images 3-4. */
    storyImages: jsonb("story_images").$type<string[]>().notNull().default([]),
    storyImageLabels: jsonb("story_image_labels").$type<string[]>().notNull().default([]),
    details: jsonb("details").$type<string[]>().notNull(),
    materials: text("materials").notNull().default(""),
    care: text("care").notNull().default(""),
    rating: real("rating").notNull().default(5),
    reviewCount: integer("review_count").notNull().default(0),
    stock: integer("stock").notNull().default(40),
    badge: text("badge"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNewArrival: boolean("is_new_arrival").notNull().default(false),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_category_idx").on(table.category),
    index("products_collection_idx").on(table.collectionSlug),
  ],
);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  defaultAddress1: text("default_address1").notNull().default(""),
  defaultAddress2: text("default_address2").notNull().default(""),
  defaultCity: text("default_city").notNull().default(""),
  defaultRegion: text("default_region").notNull().default(""),
  defaultPostalCode: text("default_postal_code").notNull().default(""),
  defaultCountry: text("default_country").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    location: text("location").notNull().default(""),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Set when the review came from a signed-in client account. */
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    verified: boolean("verified").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_product_idx").on(table.productId)],
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  address1: text("address1").notNull(),
  address2: text("address2").notNull().default(""),
  city: text("city").notNull(),
  region: text("region").notNull().default(""),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  phone: text("phone").notNull().default(""),
  shippingMethod: text("shipping_method").notNull().default("standard"),
  currency: text("currency").notNull().default("USD"),
  fxRate: real("fx_rate").notNull().default(1),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull().default(0),
  taxCents: integer("tax_cents").notNull().default(0),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  trackingNumber: text("tracking_number").notNull().default(""),
  discountCode: text("discount_code").notNull().default(""),
  discountCents: integer("discount_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    image: text("image").notNull(),
    size: text("size").notNull().default(""),
    color: text("color").notNull().default(""),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/**
 * Promotional codes. `scope` decides what the code applies to:
 *   all        → every line in the bag
 *   category   → one product category, e.g. Footwear
 *   collection → one collection slug
 *   product    → a single product slug
 */
/**
 * Stock held per colour-and-size combination. `products.stock` is kept as the
 * sum of these rows so the catalogue keeps a single source of truth.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    color: text("color").notNull(),
    size: text("size").notNull(),
    stock: integer("stock").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_variants_unique").on(table.productId, table.color, table.size),
    index("product_variants_product_idx").on(table.productId),
  ],
);

export type ProductVariant = typeof productVariants.$inferSelect;

/** Pieces a signed-in client has saved to their wishlist. */
export const favourites = pgTable(
  "favourites",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("favourites_unique").on(table.customerId, table.productId)],
);

export type Favourite = typeof favourites.$inferSelect;

export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull().default(""),
  type: text("type").notNull().default("percent"), // percent | fixed
  value: integer("value").notNull(), // percent (1-70) or cents
  scope: text("scope").notNull().default("all"), // all | category | collection | product
  scopeValue: text("scope_value").notNull().default(""),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  maxRedemptions: integer("max_redemptions"),
  redeemedCount: integer("redeemed_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DiscountCode = typeof discountCodes.$inferSelect;



/**
 * Saved cards. Only the brand, last four digits and expiry are kept — never
 * the full number or the CVC, matching real PCI practice for a demo store.
 */
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  last4: text("last4").notNull(),
  expMonth: integer("exp_month").notNull(),
  expYear: integer("exp_year").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;

/** One row per status change, so the customer gets a real tracking timeline. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId)],
);

export type OrderEvent = typeof orderEvents.$inferSelect;

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
