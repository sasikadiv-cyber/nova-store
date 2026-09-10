/**
 * Generates supabase-setup.sql from the local database — the schema plus every
 * row of demo data — so the whole shop can be recreated in the Supabase SQL
 * editor in one paste.
 *
 *   node scripts/generate-setup-sql.mjs
 */
import { Client } from "pg";
import { writeFileSync } from "node:fs";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

/* ------------------------------------------------------------ SQL literals */

const lit = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Array.isArray(value)) return litJson(value);
  if (typeof value === "object") return litJson(value);
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
};

const litJson = (value) => lit(JSON.stringify(value));

const bool = (row, key) => (row[key] === null || row[key] === undefined ? "NULL" : row[key] ? "TRUE" : "FALSE");
const num = (row, key) => (row[key] === null || row[key] === undefined ? "NULL" : String(row[key]));

/** Builds a VALUES list for the given table using a per-row formatter. */
function values(rows, formatRow) {
  if (rows.length === 0) return null;
  return rows.map(formatRow).join(",\n");
}

function insert(table, columns, rowsSql) {
  if (!rowsSql) return `-- ${table}: no rows\n`;
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${rowsSql}\nON CONFLICT (id) DO NOTHING;`;
}

const SCHEMA = `-- ===========================================================================
--  NOVA — complete storefront setup (schema + demo data)
--  Paste into the Supabase SQL editor and run. Safe to re-run.
--
--  Tables: collections, products, customers, payment_methods, reviews,
--          subscribers, discount_codes, orders, order_items, order_events,
--          favourites, product_variants
-- ===========================================================================

-- ------------------------------------------------------------------ schema

CREATE TABLE IF NOT EXISTS collections (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  tagline     text NOT NULL,
  description text NOT NULL,
  image       text NOT NULL,
  accent      text NOT NULL DEFAULT '#0b0b0c',
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id                 serial PRIMARY KEY,
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  subtitle           text NOT NULL,
  description        text NOT NULL,
  story              text NOT NULL DEFAULT '',
  category           text NOT NULL,
  gender             text NOT NULL DEFAULT 'Unisex',
  collection_slug    text NOT NULL DEFAULT 'elevated-essentials',
  price_cents        integer NOT NULL,
  compare_at_cents   integer,
  colors             jsonb NOT NULL,
  sizes              jsonb NOT NULL,
  size_type          text NOT NULL DEFAULT 'alpha',
  images             jsonb NOT NULL,
  image_labels       jsonb NOT NULL DEFAULT '[]'::jsonb,
  story_images       jsonb NOT NULL DEFAULT '[]'::jsonb,
  story_image_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  details            jsonb NOT NULL,
  materials          text NOT NULL DEFAULT '',
  care               text NOT NULL DEFAULT '',
  rating             real NOT NULL DEFAULT 5,
  review_count       integer NOT NULL DEFAULT 0,
  stock              integer NOT NULL DEFAULT 40,
  badge              text,
  is_featured        boolean NOT NULL DEFAULT FALSE,
  is_new_arrival     boolean NOT NULL DEFAULT FALSE,
  is_best_seller     boolean NOT NULL DEFAULT FALSE,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx    ON products (category);
CREATE INDEX IF NOT EXISTS products_collection_idx  ON products (collection_slug);

CREATE TABLE IF NOT EXISTS customers (
  id                   serial PRIMARY KEY,
  email                text NOT NULL UNIQUE,
  password_hash        text NOT NULL,
  full_name            text NOT NULL,
  phone                text NOT NULL DEFAULT '',
  default_address1     text NOT NULL DEFAULT '',
  default_address2     text NOT NULL DEFAULT '',
  default_city         text NOT NULL DEFAULT '',
  default_region       text NOT NULL DEFAULT '',
  default_postal_code  text NOT NULL DEFAULT '',
  default_country      text NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id          serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  brand       text NOT NULL,
  last4       text NOT NULL,
  exp_month   integer NOT NULL,
  exp_year    integer NOT NULL,
  is_default  boolean NOT NULL DEFAULT FALSE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          serial PRIMARY KEY,
  product_id  integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id integer REFERENCES customers (id) ON DELETE SET NULL,
  author      text NOT NULL,
  location    text NOT NULL DEFAULT '',
  rating      integer NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  verified    boolean NOT NULL DEFAULT TRUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews (product_id);

CREATE TABLE IF NOT EXISTS subscribers (
  id         serial PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id                  serial PRIMARY KEY,
  code                text NOT NULL UNIQUE,
  label               text NOT NULL DEFAULT '',
  type                text NOT NULL DEFAULT 'percent',
  value               integer NOT NULL,
  scope               text NOT NULL DEFAULT 'all',
  scope_value         text NOT NULL DEFAULT '',
  min_subtotal_cents  integer NOT NULL DEFAULT 0,
  max_redemptions     integer,
  redeemed_count      integer NOT NULL DEFAULT 0,
  starts_at           timestamptz,
  ends_at             timestamptz,
  active              boolean NOT NULL DEFAULT TRUE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              serial PRIMARY KEY,
  order_number    text NOT NULL UNIQUE,
  email           text NOT NULL,
  full_name       text NOT NULL,
  address1        text NOT NULL,
  address2        text NOT NULL DEFAULT '',
  city            text NOT NULL,
  region          text NOT NULL DEFAULT '',
  postal_code     text NOT NULL,
  country         text NOT NULL,
  phone           text NOT NULL DEFAULT '',
  shipping_method text NOT NULL DEFAULT 'standard',
  currency        text NOT NULL DEFAULT 'USD',
  fx_rate         real NOT NULL DEFAULT 1,
  subtotal_cents  integer NOT NULL,
  shipping_cents  integer NOT NULL DEFAULT 0,
  tax_cents       integer NOT NULL DEFAULT 0,
  customer_id     integer REFERENCES customers (id) ON DELETE SET NULL,
  tracking_number text NOT NULL DEFAULT '',
  discount_code   text NOT NULL DEFAULT '',
  discount_cents  integer NOT NULL DEFAULT 0,
  total_cents     integer NOT NULL,
  status          text NOT NULL DEFAULT 'confirmed',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id               serial PRIMARY KEY,
  order_id         integer NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id       integer NOT NULL,
  slug             text NOT NULL,
  name             text NOT NULL,
  image            text NOT NULL,
  size             text NOT NULL DEFAULT '',
  color            text NOT NULL DEFAULT '',
  quantity         integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  line_total_cents integer NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_events (
  id         serial PRIMARY KEY,
  order_id   integer NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status     text NOT NULL,
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id);

CREATE TABLE IF NOT EXISTS favourites (
  id          serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  product_id  integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS favourites_unique ON favourites (customer_id, product_id);

CREATE TABLE IF NOT EXISTS product_variants (
  id         serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  color      text NOT NULL,
  size       text NOT NULL,
  stock      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_unique ON product_variants (product_id, color, size);
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants (product_id);
`;

/* --------------------------------------------------------------- generator */

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

const out = [SCHEMA, "\n-- ------------------------------------------------------------------ data\n"];

/* collections */
const collections = await client.query("SELECT * FROM collections ORDER BY id");
out.push(
  insert(
    "collections",
    ["id", "slug", "name", "tagline", "description", "image", "accent", "sort_order"],
    values(collections.rows, (r) =>
      `(${num(r, "id")}, ${lit(r.slug)}, ${lit(r.name)}, ${lit(r.tagline)}, ${lit(r.description)}, ${lit(r.image)}, ${lit(r.accent)}, ${num(r, "sort_order")})`,
    ),
  ),
);

/* products */
const products = await client.query("SELECT * FROM products ORDER BY id");
out.push(
  insert(
    "products",
    [
      "id", "slug", "name", "subtitle", "description", "story", "category", "gender",
      "collection_slug", "price_cents", "compare_at_cents", "colors", "sizes", "size_type",
      "images", "image_labels", "story_images", "story_image_labels", "details", "materials",
      "care", "rating", "review_count", "stock", "badge", "is_featured", "is_new_arrival",
      "is_best_seller", "created_at",
    ],
    values(products.rows, (r) =>
      `(${num(r, "id")}, ${lit(r.slug)}, ${lit(r.name)}, ${lit(r.subtitle)}, ${lit(r.description)}, ${lit(r.story)}, ${lit(r.category)}, ${lit(r.gender)}, ${lit(r.collection_slug)}, ${num(r, "price_cents")}, ${num(r, "compare_at_cents")}, ${lit(r.colors)}, ${lit(r.sizes)}, ${lit(r.size_type)}, ${lit(r.images)}, ${lit(r.image_labels)}, ${lit(r.story_images)}, ${lit(r.story_image_labels)}, ${lit(r.details)}, ${lit(r.materials)}, ${lit(r.care)}, ${num(r, "rating")}, ${num(r, "review_count")}, ${num(r, "stock")}, ${lit(r.badge)}, ${bool(r, "is_featured")}, ${bool(r, "is_new_arrival")}, ${bool(r, "is_best_seller")}, ${lit(r.created_at)})`,
    ),
  ),
);

/* customers */
const customers = await client.query("SELECT * FROM customers ORDER BY id");
out.push(
  insert(
    "customers",
    ["id", "email", "password_hash", "full_name", "phone", "default_address1", "default_address2", "default_city", "default_region", "default_postal_code", "default_country", "created_at"],
    values(customers.rows, (r) =>
      `(${num(r, "id")}, ${lit(r.email)}, ${lit(r.password_hash)}, ${lit(r.full_name)}, ${lit(r.phone)}, ${lit(r.default_address1)}, ${lit(r.default_address2)}, ${lit(r.default_city)}, ${lit(r.default_region)}, ${lit(r.default_postal_code)}, ${lit(r.default_country)}, ${lit(r.created_at)})`,
    ),
  ),
);

/* payment_methods */
const cards = await client.query("SELECT * FROM payment_methods ORDER BY id");
out.push(
  insert(
    "payment_methods",
    ["id", "customer_id", "brand", "last4", "exp_month", "exp_year", "is_default", "created_at"],
    values(cards.rows, (r) =>
      `(${num(r, "id")}, ${num(r, "customer_id")}, ${lit(r.brand)}, ${lit(r.last4)}, ${num(r, "exp_month")}, ${num(r, "exp_year")}, ${bool(r, "is_default")}, ${lit(r.created_at)})`,
    ),
  ),
);

/* reviews */
const reviews = await client.query("SELECT * FROM reviews ORDER BY id");
out.push(
  insert(
    "reviews",
    ["id", "product_id", "customer_id", "author", "location", "rating", "title", "body", "verified", "created_at"],
    values(reviews.rows, (r) =>
      `(${num(r, "id")}, ${num(r, "product_id")}, ${num(r, "customer_id")}, ${lit(r.author)}, ${lit(r.location)}, ${num(r, "rating")}, ${lit(r.title)}, ${lit(r.body)}, ${bool(r, "verified")}, ${lit(r.created_at)})`,
    ),
  ),
);

/* subscribers */
const subs = await client.query("SELECT * FROM subscribers ORDER BY id");
out.push(
  subs.rows.length
    ? `INSERT INTO subscribers (id, email, created_at) VALUES\n${values(subs.rows, (r) => `(${num(r, "id")}, ${lit(r.email)}, ${lit(r.created_at)})`)}\nON CONFLICT (id) DO NOTHING;`
    : "-- subscribers: no rows",
);

/* discount_codes */
const codes = await client.query("SELECT * FROM discount_codes ORDER BY id");
out.push(
  insert(
    "discount_codes",
    ["id", "code", "label", "type", "value", "scope", "scope_value", "min_subtotal_cents", "max_redemptions", "redeemed_count", "starts_at", "ends_at", "active", "created_at"],
    values(codes.rows, (r) =>
      `(${num(r, "id")}, ${lit(r.code)}, ${lit(r.label)}, ${lit(r.type)}, ${num(r, "value")}, ${lit(r.scope)}, ${lit(r.scope_value)}, ${num(r, "min_subtotal_cents")}, ${num(r, "max_redemptions")}, ${num(r, "redeemed_count")}, ${lit(r.starts_at)}, ${lit(r.ends_at)}, ${bool(r, "active")}, ${lit(r.created_at)})`,
    ),
  ),
);

/* orders */
const orders = await client.query("SELECT * FROM orders ORDER BY id");
out.push(
  insert(
    "orders",
    ["id", "order_number", "email", "full_name", "address1", "address2", "city", "region", "postal_code", "country", "phone", "shipping_method", "currency", "fx_rate", "subtotal_cents", "shipping_cents", "tax_cents", "customer_id", "tracking_number", "discount_code", "discount_cents", "total_cents", "status", "created_at"],
    values(orders.rows, (r) =>
      `(${num(r, "id")}, ${lit(r.order_number)}, ${lit(r.email)}, ${lit(r.full_name)}, ${lit(r.address1)}, ${lit(r.address2)}, ${lit(r.city)}, ${lit(r.region)}, ${lit(r.postal_code)}, ${lit(r.country)}, ${lit(r.phone)}, ${lit(r.shipping_method)}, ${lit(r.currency)}, ${num(r, "fx_rate")}, ${num(r, "subtotal_cents")}, ${num(r, "shipping_cents")}, ${num(r, "tax_cents")}, ${num(r, "customer_id")}, ${lit(r.tracking_number)}, ${lit(r.discount_code)}, ${num(r, "discount_cents")}, ${num(r, "total_cents")}, ${lit(r.status)}, ${lit(r.created_at)})`,
    ),
  ),
);

/* order_items */
const items = await client.query("SELECT * FROM order_items ORDER BY id");
out.push(
  insert(
    "order_items",
    ["id", "order_id", "product_id", "slug", "name", "image", "size", "color", "quantity", "unit_price_cents", "line_total_cents"],
    values(items.rows, (r) =>
      `(${num(r, "id")}, ${num(r, "order_id")}, ${num(r, "product_id")}, ${lit(r.slug)}, ${lit(r.name)}, ${lit(r.image)}, ${lit(r.size)}, ${lit(r.color)}, ${num(r, "quantity")}, ${num(r, "unit_price_cents")}, ${num(r, "line_total_cents")})`,
    ),
  ),
);

/* order_events */
const events = await client.query("SELECT * FROM order_events ORDER BY id");
out.push(
  insert(
    "order_events",
    ["id", "order_id", "status", "note", "created_at"],
    values(events.rows, (r) =>
      `(${num(r, "id")}, ${num(r, "order_id")}, ${lit(r.status)}, ${lit(r.note)}, ${lit(r.created_at)})`,
    ),
  ),
);

/* favourites */
const favs = await client.query("SELECT * FROM favourites ORDER BY id");
out.push(
  favs.rows.length
    ? `INSERT INTO favourites (id, customer_id, product_id, created_at) VALUES\n${values(favs.rows, (r) => `(${num(r, "id")}, ${num(r, "customer_id")}, ${num(r, "product_id")}, ${lit(r.created_at)})`)}\nON CONFLICT (id) DO NOTHING;`
    : "-- favourites: no rows",
);

/* product_variants */
const variants = await client.query("SELECT * FROM product_variants ORDER BY id");
out.push(
  insert(
    "product_variants",
    ["id", "product_id", "color", "size", "stock", "updated_at"],
    values(variants.rows, (r) =>
      `(${num(r, "id")}, ${num(r, "product_id")}, ${lit(r.color)}, ${lit(r.size)}, ${num(r, "stock")}, ${lit(r.updated_at)})`,
    ),
  ),
);

/* ----------------------------------------------- keep sequences in step */

const SEQUENCED = [
  "collections", "products", "customers", "payment_methods", "reviews",
  "subscribers", "discount_codes", "orders", "order_items", "order_events",
  "favourites", "product_variants",
];

out.push("\n-- ------------------------------------------------- resync sequences");
out.push(
  SEQUENCED.map(
    (table) =>
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, FALSE);`,
  ).join("\n"),
);

out.push(`
-- ---------------------------------------------------- Supabase API security
-- This application uses its server-side PostgreSQL connection and its own
-- signed-cookie authentication. No table is intended to be read through the
-- public Supabase Data API. Enabling RLS with no public policies blocks anon
-- and authenticated API roles; the server database role continues to work.
ALTER TABLE collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------- done
-- Demo accounts
--   store owner : your ADMIN_EMAIL / ADMIN_PASSWORD from the environment
--   client      : client@nova.com / nova1234
-- Discount codes: NOVAWELCOME (10% store), FOOTWEAR20 (20% Footwear), ESSENTIAL25 ($25 off Essentials, min $300)
`);

await client.end();

const sql = out.join("\n\n") + "\n";
writeFileSync("supabase-setup.sql", sql);

const lineCount = sql.split("\n").length;
console.log(`supabase-setup.sql written — ${lineCount} lines, ${(sql.length / 1024).toFixed(1)} KB`);
console.log(
  `rows: ${collections.rows.length} collections, ${products.rows.length} products, ${reviews.rows.length} reviews, ${variants.rows.length} variants, ${orders.rows.length} orders`,
);
