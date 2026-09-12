-- ===========================================================================
--  NOVA — complete storefront setup (schema + demo data)
--  Paste into the Supabase SQL editor and run. Safe to re-run.
--
--  Tables: collections, products, customers, reviews,
--          subscribers, discount_codes, orders, order_items, order_events,
--          favourites, product_variants, site_pages, contact_messages
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
  complete_look      jsonb NOT NULL DEFAULT '[]'::jsonb,
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

CREATE TABLE IF NOT EXISTS currency_rules (
  code            text PRIMARY KEY,
  fx_rate         real NOT NULL DEFAULT 1,
  markup_percent  real NOT NULL DEFAULT 0,
  rounding        text NOT NULL DEFAULT 'none',
  active          boolean NOT NULL DEFAULT TRUE,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id             serial PRIMARY KEY,
  code           text NOT NULL UNIQUE,
  initial_cents  integer NOT NULL,
  balance_cents  integer NOT NULL,
  note           text NOT NULL DEFAULT '',
  active         boolean NOT NULL DEFAULT TRUE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id             serial PRIMARY KEY,
  email          text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  name           text NOT NULL DEFAULT '',
  role           text NOT NULL DEFAULT 'stock_manager',
  active         boolean NOT NULL DEFAULT TRUE,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_pages (
  slug        text PRIMARY KEY,
  title       text NOT NULL,
  eyebrow     text NOT NULL DEFAULT '',
  intro       text NOT NULL DEFAULT '',
  blocks      jsonb NOT NULL DEFAULT '[]'::jsonb,
  published   boolean NOT NULL DEFAULT TRUE,
  sort_order  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text NOT NULL DEFAULT '',
  message    text NOT NULL,
  handled    boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now()
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

CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

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



-- ------------------------------------------------------------------ data


INSERT INTO collections (id, slug, name, tagline, description, image, accent, sort_order) VALUES
(1, 'winter-edit', 'The Winter Edit', 'Sculpted outerwear for cold-weather cities', 'Double-faced wools, storm-proof cottons and shearling linings cut for long winters in Seoul, Berlin and New York.', 'https://images.pexels.com/photos/19099688/pexels-photo-19099688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500', '#1c2430', 1),
(2, 'elevated-essentials', 'Elevated Essentials', 'The everyday layer, reconsidered', 'Grade-A cashmere, merino and long-staple cottons in a palette designed to be worn on repeat, season after season.', 'https://images.pexels.com/photos/30569741/pexels-photo-30569741.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500', '#3a3128', 2),
(3, 'footwear-atelier', 'The Footwear Atelier', 'Hand-finished in Porto', 'Vegetable-tanned leathers, Blake-stitched soles and cushioned footbeds built in a family-run atelier in northern Portugal.', 'https://images.pexels.com/photos/12628400/pexels-photo-12628400.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500', '#101215', 3),
(4, 'after-hours', 'After Hours', 'Evening silhouettes in liquid silk', 'Bias-cut slips and column dresses that travel well, pack smaller and hold their drape from dinner to last call.', 'https://images.pexels.com/photos/15272935/pexels-photo-15272935.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500', '#221a20', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, slug, name, subtitle, description, story, category, gender, collection_slug, price_cents, compare_at_cents, colors, sizes, size_type, images, image_labels, story_images, story_image_labels, details, materials, care, rating, review_count, stock, badge, is_featured, is_new_arrival, is_best_seller, created_at) VALUES
(1, 'aurora-double-faced-wool-coat', 'Aurora Double-Faced Wool Coat', 'Unlined Italian wool, sculpted shoulder', 'A generously cut wrap coat in a double-faced wool from a mill in Biella. The unlined construction keeps the drape soft while the hidden placket and self-tie belt let you shape the silhouette.', 'Each Aurora is cut from a single 3.2 metre length of double-faced wool and finished by hand — the seams are tucked and blind-stitched rather than fused, so the coat moves like knitwear.', 'Outerwear', 'Women', 'winter-edit', 69000, 86000, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#38393c","name":"Charcoal","family":"Black"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/29879990/pexels-photo-29879990.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19099691/pexels-photo-19099691.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19099688/pexels-photo-19099688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19169495/pexels-photo-19169495.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Relaxed fit — size down for a closer shape","Hidden press-stud placket with self-tie belt","Angora-soft double-faced wool, 740gsm","Two welt pockets, fully bound interior seams"]', '82% virgin wool, 18% cashmere. Lining: none (double-faced construction).', 'Dry clean only. Store on a broad wooden hanger.', 4.7, 3, 19, 'Atelier', TRUE, FALSE, TRUE, '[]', '2026-09-03T09:08:33.532Z'),
(2, 'meridian-cotton-trench', 'Meridian Cotton Trench', 'Storm-proof cotton gabardine', 'A modern trench with a cleaner shoulder and a longer line, cut in densely woven cotton gabardine that shrugs off a sudden downpour.', 'We rebuilt the classic trench block from scratch — dropping the belt loops, raising the collar stand and adding a two-way zip behind the placket so it works on a bike as well as in a taxi.', 'Outerwear', 'Women', 'winter-edit', 54000, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#6b6d72","name":"Graphite","family":"Grey"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/19099688/pexels-photo-19099688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19099691/pexels-photo-19099691.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19138141/pexels-photo-19138141.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/9571461/pexels-photo-9571461.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Water-repellent finish, PFC-free","Two-way zip beneath a buttoned storm placket","Detachable self-belt with metal buckle","Back vent for movement"]', '100% cotton gabardine. Trim: recycled polyester twill.', 'Machine wash cold on a gentle cycle. Hang dry.', 4.5, 2, 23, NULL, TRUE, FALSE, FALSE, '["atelier-loafer","ribbed-cashmere-turtleneck"]', '2026-09-03T18:08:33.532Z'),
(3, 'halo-shearling-bomber', 'Halo Shearling Bomber', 'Recycled shearling, cropped line', 'A cropped bomber in plush recycled shearling with a wide shawl collar. Warm enough for -5°C, light enough to drive in.', 'The pile is knitted onto a recycled base rather than woven, which makes it stretchy, breathable and machine washable.', 'Outerwear', 'Women', 'winter-edit', 48000, 56000, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#121212","name":"Black","family":"Black"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/20264967/pexels-photo-20264967.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/35117783/pexels-photo-35117783.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/36185756/pexels-photo-36185756.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19169491/pexels-photo-19169491.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Cropped at the high hip","Wide shawl collar and dropped shoulder","Recycled pile on a stretch knit base","Concealed side-entry pockets"]', '62% recycled polyester, 33% wool, 5% elastane.', 'Machine wash cold, reshape while damp, dry flat.', 4.5, 2, 15, 'New', FALSE, TRUE, FALSE, '[]', '2026-09-04T03:08:33.532Z'),
(4, 'atlas-wool-overcoat', 'Atlas Wool Overcoat', 'Single-breasted, half-canvassed', 'A single-breasted overcoat in a melton wool blend with a half-canvassed chest and a clean, undarted front.', 'Cut slightly shorter than a traditional overcoat so it reads sharp under a tailoring jacket and easy over a hoodie.', 'Outerwear', 'Men', 'winter-edit', 72000, NULL, '[{"hex":"#6b6d72","name":"Graphite","family":"Grey"},{"hex":"#38393c","name":"Charcoal","family":"Black"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#f8f6f2","name":"Optic White","family":"White"}]', '["S","M","L","XL","XXL"]', 'alpha', '["https://images.pexels.com/photos/28426899/pexels-photo-28426899.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/29259451/pexels-photo-29259451.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/21967304/pexels-photo-21967304.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19801910/pexels-photo-19801910.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Half-canvassed chest with floating horsehair canvas","Horn-look buttons, working cuff buttons","Interior pocket sized for a phone and passport","Centre back vent, 108cm length in size M"]', '70% wool, 20% polyamide, 10% cashmere. Lining: cupro.', 'Dry clean only. Brush with a horsehair brush between wears.', 4.7, 3, 16, NULL, TRUE, FALSE, FALSE, '[]', '2026-09-04T12:08:33.532Z'),
(5, 'noir-technical-parka', 'Noir Technical Parka', '3-layer shell, fully taped seams', 'A matte three-layer parka with a storm hood, pit zips and a drawcord hem — built for sideways rain and long airport walks.', 'The face fabric is a recycled nylon ripstop with a solvent-free membrane, rated 20k/20k so it breathes on the climb.', 'Outerwear', 'Unisex', 'winter-edit', 64000, NULL, '[{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#38393c","name":"Charcoal","family":"Black"},{"hex":"#6b6d72","name":"Graphite","family":"Grey"}]', '["S","M","L","XL","XXL"]', 'alpha', '["https://images.pexels.com/photos/19801910/pexels-photo-19801910.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/21967304/pexels-photo-21967304.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/29037366/pexels-photo-29037366.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/16845071/pexels-photo-16845071.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["20,000mm waterproof / 20,000g breathability","Fully taped seams and water-resistant zips","Adjustable storm hood with a stiffened brim","Packs into its own left pocket"]', '100% recycled nylon ripstop with a PFC-free membrane.', 'Machine wash cold with technical detergent. Do not tumble dry.', 5, 2, 22, NULL, FALSE, TRUE, FALSE, '[]', '2026-09-04T21:08:33.532Z'),
(6, 'cloudsoft-cashmere-crew', 'Cloudsoft Cashmere Crew', 'Grade-A Mongolian cashmere, 4-ply', 'A four-ply cashmere crew with ribbed edges and a slightly relaxed body. The fibres are 36mm long, which is why it never itches.', 'Knitted in Inner Mongolia on vintage flat-bed machines at a low tension, then washed in soft water for 40 minutes to bloom the halo.', 'Knitwear', 'Women', 'elevated-essentials', 32000, 39500, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#38393c","name":"Charcoal","family":"Black"},{"hex":"#121212","name":"Black","family":"Black"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/6995886/pexels-photo-6995886.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/24740436/pexels-photo-24740436.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/29865096/pexels-photo-29865096.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/30569741/pexels-photo-30569741.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["4-ply, 620gsm Grade-A cashmere","Fully fashioned shoulders — no bulky seams","Ribbed collar, cuffs and hem","Relaxed body, sleeves cut to the wrist bone"]', '100% Grade-A Mongolian cashmere.', 'Hand wash cool with cashmere shampoo. Dry flat away from heat.', 4.7, 3, 34, NULL, TRUE, FALSE, TRUE, '[]', '2026-09-05T06:08:33.532Z'),
(7, 'ribbed-merino-turtleneck', 'Ribbed Merino Turtleneck', 'Extra-fine 19.5 micron merino', 'A fine-gauge ribbed turtleneck that layers flat under tailoring but reads as a statement on its own.', 'Knitted in a 3x1 rib with a touch of elastane so the collar keeps standing after the tenth wear.', 'Knitwear', 'Women', 'elevated-essentials', 24500, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#222d42","name":"Navy","family":"Blue"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/6995884/pexels-photo-6995884.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/6995898/pexels-photo-6995898.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/6996083/pexels-photo-6996083.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/14641430/pexels-photo-14641430.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Extra-fine 19.5 micron merino, machine washable","Self-standing ribbed collar","Sleeveless-friendly cropped hip length","Fully reversible silhouette"]', '96% extra-fine merino wool, 4% elastane.', 'Machine wash wool cycle at 30°C. Dry flat.', 4.5, 2, 45, NULL, FALSE, FALSE, TRUE, '[]', '2026-09-05T15:08:33.532Z'),
(8, 'atelier-oversized-cardigan', 'Atelier Oversized Cardigan', 'Chunky cable front, drop shoulder', 'A generously oversized cardigan with deep patch pockets, meant to be worn open as a house coat or belt as outerwear.', 'The yarn is a wool-cotton blend spun in Tuscany, giving cable definition without the weight of pure lambswool.', 'Knitwear', 'Unisex', 'elevated-essentials', 28500, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#4a5343","name":"Moss","family":"Green"}]', '["S","M","L"]', 'alpha', '["https://images.pexels.com/photos/9603626/pexels-photo-9603626.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/29865096/pexels-photo-29865096.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/14641430/pexels-photo-14641430.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/24740436/pexels-photo-24740436.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Oversized — take your usual size for a relaxed fit","Deep patch pockets and dropped shoulders","Corozo nut buttons","Cable-front panel with plain sleeves"]', '55% wool, 40% cotton, 5% alpaca.', 'Hand wash cool or dry clean. Dry flat.', 5, 2, 27, NULL, FALSE, FALSE, FALSE, '[]', '2026-09-06T00:08:33.532Z'),
(9, 'heritage-cable-knit', 'Heritage Cable Knit', 'Lambswool fisherman knit', 'A traditional fisherman''s cable knit with saddle shoulders and a high neck, updated with a slightly slimmer sleeve.', 'Knitted in a Scottish mill that has been making ganseys since 1874, using lambswool from the Borders.', 'Knitwear', 'Men', 'elevated-essentials', 26500, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#38393c","name":"Charcoal","family":"Black"},{"hex":"#1f2942","name":"Navy","family":"Blue"}]', '["S","M","L","XL","XXL"]', 'alpha', '["https://images.pexels.com/photos/12056642/pexels-photo-12056642.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/30569741/pexels-photo-30569741.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/14641430/pexels-photo-14641430.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/9603626/pexels-photo-9603626.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Saddle shoulder for a fuller chest","Traditional honeycomb and cable panels","Ribbed funnel neck","Naturally water-resistant lanolin-rich wool"]', '100% British lambswool.', 'Hand wash cool. Dry flat. Refresh in fresh air between wears.', 4.5, 2, 23, NULL, FALSE, FALSE, FALSE, '[]', '2026-09-06T09:08:33.532Z'),
(10, 'nova-court-leather-sneaker', 'Nova Court Leather Sneaker', 'Italian calfskin, cupsole', 'A pared-back court sneaker in full-grain Italian calfskin on a hand-stitched cupsole. No logos, no branding — just the shape.', 'The upper is cut from a single hide so the grain runs continuously down the vamp, then Blake-stitched to the sole so it can be resoled.', 'Footwear', 'Unisex', 'footwear-atelier', 24000, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#121212","name":"Black","family":"Black"}]', '["40","41","42","43","44","45"]', 'shoe', '["https://images.pexels.com/photos/7193629/pexels-photo-7193629.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/18202585/pexels-photo-18202585.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/7193625/pexels-photo-7193625.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/12628400/pexels-photo-12628400.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Full-grain calfskin from a Tuscan tannery","Blake-stitched, fully resoleable cupsole","Removable moulded footbed with arch support","Runs true to size; half sizes coming soon"]', 'Upper: Italian calfskin. Lining: vegetable-tanned leather. Sole: natural rubber.', 'Wipe with a damp cloth. Condition every 8-10 wears.', 4.7, 3, 40, NULL, TRUE, FALSE, TRUE, '[]', '2026-09-06T18:08:33.532Z'),
(11, 'trace-runner', 'Trace Runner', 'Recycled knit upper, foam midsole', 'A low-profile everyday runner in a seamless recycled knit with a supercritical foam midsole and a 6mm drop.', 'Weighs 218g in a size 42. The midsole foam is nitrogen-injected, so it stays lively past 600km.', 'Footwear', 'Unisex', 'footwear-atelier', 21000, 25000, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#6b6d72","name":"Graphite","family":"Grey"},{"hex":"#121212","name":"Black","family":"Black"}]', '["40","41","42","43","44","45"]', 'shoe', '["https://images.pexels.com/photos/8188879/pexels-photo-8188879.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/20191568/pexels-photo-20191568.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/20191567/pexels-photo-20191567.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/18202585/pexels-photo-18202585.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["218g (size 42)","6mm heel-to-toe drop","Seamless recycled knit upper — no tongue break","Nitrogen-injected supercritical foam"]', 'Upper: 92% recycled polyester knit. Midsole: EVA/TPU blend. Outsole: recycled rubber.', 'Hand wash upper with mild soap. Air dry.', 5, 2, 51, NULL, FALSE, FALSE, TRUE, '[]', '2026-09-07T03:08:33.532Z'),
(12, 'pop-court-sneaker', 'Pop Court Sneaker', 'Colour-blocked suede and mesh', 'The Court''s louder sibling: colour-blocked suede overlays on a breathable mesh base with a gum rubber outsole.', 'Developed with a small studio in Porto that specialises in hand-burnished suede panels.', 'Footwear', 'Unisex', 'footwear-atelier', 19500, NULL, '[{"hex":"#2b4c9b","name":"Cobalt","family":"Blue"},{"hex":"#b8342c","name":"Signal Red","family":"Red"},{"hex":"#f6f4f0","name":"Optic White","family":"White"}]', '["40","41","42","43","44","45"]', 'shoe', '["https://images.pexels.com/photos/11324546/pexels-photo-11324546.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/11324526/pexels-photo-11324526.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/14525666/pexels-photo-14525666.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/20191567/pexels-photo-20191567.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Hand-burnished suede overlays","Gum rubber outsole with a herringbone tread","Padded collar and cushioned insole","Sizing: generous — consider going down a half size"]', 'Upper: pig suede and recycled mesh. Outsole: natural gum rubber.', 'Brush suede dry. Protect with a suede spray before first wear.', 4.5, 2, 18, 'Limited', FALSE, TRUE, FALSE, '[]', '2026-09-07T12:08:33.532Z'),
(13, 'meridian-chelsea-boot', 'Meridian Chelsea Boot', 'Vegetable-tanned leather, chunky sole', 'A city Chelsea boot in vegetable-tanned leather with elasticated gussets and a lug sole that actually grips on wet stone.', 'The last is based on a 1960s Italian motoring boot — narrow at the waist, generous at the toe.', 'Footwear', 'Women', 'footwear-atelier', 42000, NULL, '[{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#38393c","name":"Charcoal","family":"Black"},{"hex":"#6b6d72","name":"Graphite","family":"Grey"}]', '["36","37","38","39","40","41"]', 'shoe', '["https://images.pexels.com/photos/18911766/pexels-photo-18911766.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/12586098/pexels-photo-12586098.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/34235456/pexels-photo-34235456.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/11332376/pexels-photo-11332376.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Vegetable-tanned leather, 1.8mm thickness","Blake-stitched with a storm welt","Dual-density rubber lug sole, 25mm","Leather-lined with a padded footbed"]', 'Upper and lining: vegetable-tanned Italian leather. Sole: rubber/cork composite.', 'Condition monthly. Use a cedar shoe tree between wears.', 4.7, 3, 22, NULL, TRUE, FALSE, FALSE, '[]', '2026-09-07T21:08:33.532Z'),
(14, 'solstice-knee-boot', 'Solstice Knee Boot', 'Stretch leather, sculpted heel', 'A knee-high boot in a stretch leather that hugs the calf without a zip, set on a sculpted 60mm block heel.', 'The stretch comes from a bonded knit back, not from thin leather, so it keeps its shape all day.', 'Footwear', 'Women', 'footwear-atelier', 52000, NULL, '[{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#38393c","name":"Charcoal","family":"Black"}]', '["36","37","38","39","40","41"]', 'shoe', '["https://images.pexels.com/photos/32366927/pexels-photo-32366927.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/7062176/pexels-photo-7062176.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19120507/pexels-photo-19120507.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/10910252/pexels-photo-10910252.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Zip-free pull-on construction","60mm sculpted block heel","Circumference 36cm at the top (size 38)","Softly squared almond toe"]', 'Upper: stretch lambskin on a knit back. Sole: leather with a rubber toplift.', 'Wipe clean. Store upright with boot shapers.', 5, 2, 13, 'Runway', TRUE, FALSE, FALSE, '[]', '2026-09-08T06:08:33.532Z'),
(15, 'terrace-leather-loafer', 'Terrace Leather Loafer', 'Hand-sewn apron, flexible sole', 'An unlined apron-toe loafer that''s built to be worn without socks and thrown in a bag for travel.', 'The apron is sewn by hand with a saddle stitch, which is why it moulds to your foot within a week.', 'Footwear', 'Unisex', 'footwear-atelier', 31000, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#6b6d72","name":"Graphite","family":"Grey"}]', '["40","41","42","43","44","45"]', 'shoe', '["https://images.pexels.com/photos/11332376/pexels-photo-11332376.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/12586098/pexels-photo-12586098.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/34235456/pexels-photo-34235456.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/8411014/pexels-photo-8411014.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Hand-sewn apron with a saddle stitch","Unlined for a barefoot feel","Flexible rubber-city sole","Sizing: runs large — size down half"]', 'Upper: vegetable-tanned calf. Sole: flexible rubber.', 'Wipe with a damp cloth. Cream polish occasionally.', 4.5, 2, 28, NULL, FALSE, FALSE, FALSE, '[]', '2026-09-08T15:08:33.532Z'),
(16, 'liquid-silk-slip-dress', 'Liquid Silk Slip Dress', '22-momme bias-cut mulberry silk', 'A bias-cut slip in heavyweight 22-momme mulberry silk that skims rather than clings, with adjustable straps.', 'Cut on the true bias from a single panel so the dress spirals around the body — there are only two seams.', 'Dresses', 'Women', 'after-hours', 38000, 45000, '[{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#5d1f2b","name":"Bordeaux","family":"Red"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/15272935/pexels-photo-15272935.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/20821761/pexels-photo-20821761.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/5822538/pexels-photo-5822538.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/17541235/pexels-photo-17541235.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["22-momme mulberry silk, matte finish","True bias cut with French seams","Adjustable sliders on the straps","Midi length, 118cm centre back"]', '100% mulberry silk, OEKO-TEX certified.', 'Dry clean recommended, or hand wash cold with silk detergent.', 4.7, 3, 20, NULL, TRUE, FALSE, TRUE, '[]', '2026-09-09T00:08:33.532Z'),
(17, 'sunlight-linen-shirt-dress', 'Sunlight Linen Shirt Dress', 'Washed European linen', 'A shirt dress in garment-washed European linen with a detachable belt and a deep back pleat for movement.', 'The linen is woven in Normandy and washed three times before cutting, so it arrives already soft.', 'Dresses', 'Women', 'elevated-essentials', 26500, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#a7bcd0","name":"Sky","family":"Blue"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/20117711/pexels-photo-20117711.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/37291294/pexels-photo-37291294.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/12466607/pexels-photo-12466607.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/34891485/pexels-photo-34891485.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Garment-washed Normandy linen, 190gsm","Detachable self-belt","Deep back box pleat","Mother-of-pearl buttons"]', '100% European flax linen.', 'Machine wash cold. Tumble dry low to soften.', 4.5, 2, 31, NULL, FALSE, TRUE, FALSE, '[]', '2026-09-09T09:08:33.532Z'),
(18, 'ivory-column-dress', 'Ivory Column Dress', 'Crepe column, open back', 'A floor-sweeping column in heavy crepe with a square neckline and an open, cowl-hung back.', 'Internally boned through the bodice so it holds its line without a bra, and hemmed by hand.', 'Dresses', 'Women', 'after-hours', 62000, NULL, '[{"hex":"#f2ece1","name":"Ivory","family":"White"},{"hex":"#161a28","name":"Midnight","family":"Blue"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/28442112/pexels-photo-28442112.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/34891485/pexels-photo-34891485.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/34896846/pexels-photo-34896846.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/5822538/pexels-photo-5822538.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Internally boned bodice with a shelf bra","Square front neckline, cowl back","Heavy stretch crepe, 320gsm","Floor length, hand-finished hem"]', '78% triacetate, 22% polyester crepe.', 'Dry clean only. Steam to release creases.', 5, 2, 11, NULL, FALSE, FALSE, FALSE, '[]', '2026-09-09T18:08:33.532Z'),
(19, 'rose-satin-gown', 'Rose Satin Gown', 'Draped cowl, floor length', 'A liquid satin gown with a softly draped cowl front and a low, gathered back. Made for photographs.', 'The satin is a heavy 40d trilobal that reflects light in a soft halo rather than a hard shine.', 'Dresses', 'Women', 'after-hours', 54000, NULL, '[{"hex":"#d9a2a4","name":"Rose","family":"Pink"},{"hex":"#131114","name":"Black","family":"Black"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/34896846/pexels-photo-34896846.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/5822538/pexels-photo-5822538.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/34891485/pexels-photo-34891485.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/28442112/pexels-photo-28442112.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Draped cowl front and back","Hidden side zip with a hook-and-eye","Floor length with a slight train","Cut on the bias through the skirt"]', '100% trilobal polyester satin with a matte crepe back.', 'Dry clean only. Store hanging.', 4.5, 2, 14, NULL, FALSE, TRUE, FALSE, '[]', '2026-09-10T03:08:33.532Z'),
(20, 'sculpt-wool-blazer', 'Sculpt Wool Blazer', 'Half-canvassed, sharp shoulder', 'A single-breasted blazer with a lightly padded shoulder, nipped waist and a length that hits at the high hip.', 'The shoulder is built with a thin wadding layer rather than a rope, so it reads strong but not 80s.', 'Tailoring', 'Women', 'elevated-essentials', 48000, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#38393c","name":"Charcoal","family":"Black"},{"hex":"#22352c","name":"Bottle","family":"Green"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/27869836/pexels-photo-27869836.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/39202946/pexels-photo-39202946.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/15127334/pexels-photo-15127334.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19222080/pexels-photo-19222080.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Half-canvassed with a floating chest canvas","Lightly padded shoulder, two-button front","Functional cuff buttons","Bemberg cupro lining"]', '96% wool, 4% elastane suiting. Lining: cupro.', 'Dry clean only. Press on a tailor''s ham.', 5, 2, 24, NULL, TRUE, FALSE, FALSE, '[]', '2026-09-10T12:08:33.532Z'),
(21, 'wide-leg-pleated-trouser', 'Wide-Leg Pleated Trouser', 'Fluid drape, high rise', 'A high-rise, double-pleated trouser in a fluid wool blend that falls straight from the hip to a full break.', 'We tested eleven drafts before landing on a leg that reads wide but doesn''t swamp a smaller frame.', 'Tailoring', 'Women', 'elevated-essentials', 26000, NULL, '[{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#212b40","name":"Navy","family":"Blue"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/22223037/pexels-photo-22223037.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/27869836/pexels-photo-27869836.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/8891480/pexels-photo-8891480.png?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/39202946/pexels-photo-39202946.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["High rise with a hidden hook closure","Double front pleats","Full-length wide leg, 30cm opening","Unhemmed — free tailoring in-store"]', '68% wool, 30% viscose, 2% elastane.', 'Dry clean. Steam the pleats back in after travel.', 4.5, 2, 35, NULL, FALSE, FALSE, TRUE, '[]', '2026-09-10T21:08:33.532Z'),
(22, 'essential-pima-tee', 'Essential Pima Tee', 'Long-staple Peruvian pima', 'A mid-weight tee in long-staple Peruvian pima with a clean bound neckline that won''t stretch out.', 'Knitted at 200gsm, so it''s opaque enough to wear alone and smooth enough to layer under tailoring.', 'Essentials', 'Unisex', 'elevated-essentials', 8500, NULL, '[{"hex":"#f8f6f2","name":"Optic White","family":"White"},{"hex":"#eae3d6","name":"Ivory","family":"White"},{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#a9b3a0","name":"Sage","family":"Green"}]', '["S","M","L","XL","XXL"]', 'alpha', '["https://images.pexels.com/photos/18516744/pexels-photo-18516744.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/18516754/pexels-photo-18516754.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19771909/pexels-photo-19771909.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19222080/pexels-photo-19222080.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["200gsm long-staple Peruvian pima","Bound neckline, twin-needle hems","Pre-shrunk and bio-washed","Boxy but not cropped"]', '100% Peruvian pima cotton.', 'Machine wash cold. Tumble dry low.', 4.7, 3, 96, NULL, FALSE, FALSE, TRUE, '[]', '2026-09-11T06:08:33.532Z'),
(23, 'noir-evening-dress', 'Noir Evening Dress', 'Structured bodice, draped skirt', 'A black evening dress with a structured strapless bodice and a softly draped skirt that catches light as you move.', 'The bodice is bonded rather than boned, giving structure without any rigidity at the ribcage.', 'Dresses', 'Women', 'after-hours', 56000, NULL, '[{"hex":"#121212","name":"Black","family":"Black"},{"hex":"#38393c","name":"Charcoal","family":"Black"}]', '["XS","S","M","L","XL"]', 'alpha', '["https://images.pexels.com/photos/29977336/pexels-photo-29977336.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/17541235/pexels-photo-17541235.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/20821761/pexels-photo-20821761.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19771909/pexels-photo-19771909.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["Bonded structured bodice","Strapless with a silicone grip line","Draped skirt with a concealed side zip","Midi length with an asymmetric hem"]', '92% recycled polyester crepe, 8% elastane.', 'Dry clean only.', 5, 2, 10, NULL, FALSE, FALSE, FALSE, '[]', '2026-09-11T15:08:33.532Z'),
(24, 'atlas-denim-jacket', 'Atlas Denim Jacket', 'Selvedge denim, Kyoto loom', 'A boxy denim jacket in 13oz selvedge denim woven on shuttle looms in Okayama, cut to layer over knitwear.', 'Unwashed and rigid at first, it fades to your body within three months of daily wear.', 'Outerwear', 'Unisex', 'elevated-essentials', 29000, NULL, '[{"hex":"#26364f","name":"Rinse Indigo","family":"Blue"},{"hex":"#232326","name":"Washed Black","family":"Black"}]', '["S","M","L","XL","XXL"]', 'alpha', '["https://images.pexels.com/photos/15299304/pexels-photo-15299304.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/29197620/pexels-photo-29197620.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/21967310/pexels-photo-21967310.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330","https://images.pexels.com/photos/19338688/pexels-photo-19338688.png?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330"]', '[]', '[]', '[]', '["13oz unsanforized selvedge denim from Okayama","Boxy cut with a slightly longer body","Copper rivets and a chain-stitched hem","Rigid — expect 2cm shrink on first wash"]', '100% cotton selvedge denim.', 'Wash rarely, cold, inside out. Hang dry in the shade.', 4.5, 2, 29, NULL, FALSE, FALSE, FALSE, '[]', '2026-09-12T00:08:33.532Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, email, password_hash, full_name, phone, default_address1, default_address2, default_city, default_region, default_postal_code, default_country, created_at) VALUES
(1, 'client@nova.com', '3f86576f26b67ce20e25aef09cb79a10:5ba2b201fa119b0da027e554031f9bcd88459b9de519aaf1c8199bf17c2908b8df488be5f86e3c4fdcc703f749b3521ac4dcbb2f8b5505d956b2f81341457e9b', 'Amelie Laurent', '', '', '', '', '', '', '', '2026-09-12T09:09:48.354Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, product_id, customer_id, author, location, rating, title, body, verified, created_at) VALUES
(1, 1, NULL, 'Maren K.', 'Copenhagen, DK', 5, 'Worth every krone', 'The wool is dense but somehow weightless. I''ve worn it through a Danish February with only a cashmere crew underneath.', TRUE, '2026-08-31T09:08:33.547Z'),
(2, 1, NULL, 'Priya S.', 'Toronto, CA', 5, 'The drape is unreal', 'It falls exactly like the photos. Ordered the Ivory and it has not pilled once after two months of daily wear.', TRUE, '2026-07-10T09:08:33.547Z'),
(3, 1, NULL, 'Yuki T.', 'Tokyo, JP', 4, 'Beautiful, slightly long', 'Gorgeous coat. I''m 163cm so I had the hem taken up 4cm — the tailor commented on the quality of the wool.', TRUE, '2026-05-18T09:08:33.547Z'),
(4, 2, NULL, 'Elodie B.', 'Lyon, FR', 5, 'Rain tested', 'Walked 25 minutes in proper rain and stayed completely dry. It dries in an hour and doesn''t wrinkle.', TRUE, '2026-08-21T09:08:33.547Z'),
(5, 2, NULL, 'Hana A.', 'Dubai, AE', 4, 'Great for travel', 'Packs down small and the Graphite is a beautiful deep shade in person. Runs a touch large in the shoulders.', TRUE, '2026-08-13T09:08:33.547Z'),
(6, 3, NULL, 'Sofia R.', 'Milan, IT', 5, 'So soft it feels illegal', 'The pile is genuinely cloud-like and it hasn''t shed on black tops at all.', TRUE, '2026-08-06T09:08:33.547Z'),
(7, 3, NULL, 'Nadia F.', 'Istanbul, TR', 4, 'Warm and light', 'Surprised how warm it is for the weight. I would size up if you want to layer a knit under it.', TRUE, '2026-08-07T09:08:33.547Z'),
(8, 4, NULL, 'Daniel O.', 'Chicago, US', 5, 'Beats coats at twice the price', 'The chest has real structure to it — it holds the shoulder line when you sit. Fit is true to size over a shirt.', TRUE, '2026-08-29T09:08:33.547Z'),
(9, 4, NULL, 'Ken W.', 'Singapore, SG', 5, 'Tropical winter travel', 'Bought it for Tokyo in January. Warm, and the Graphite doesn''t show rain marks.', TRUE, '2026-09-04T09:08:33.547Z'),
(10, 4, NULL, 'Anders L.', 'Oslo, NO', 4, 'Lovely, sleeves run long', 'Had the sleeves shortened 2cm. Otherwise the best coat I''ve owned.', TRUE, '2026-08-13T09:08:33.547Z'),
(11, 5, NULL, 'Tom H.', 'Manchester, UK', 5, 'Manchester approved', 'If it survives a Mancunian winter it survives anything. Genuinely waterproof.', TRUE, '2026-09-06T09:08:33.547Z'),
(12, 5, NULL, 'Ines M.', 'Lisbon, PT', 5, 'Slick and quiet', 'Not crinkly like most shells. The Black is a proper deep matte.', TRUE, '2026-08-09T09:08:33.547Z'),
(13, 6, NULL, 'Claire D.', 'Melbourne, AU', 5, 'Third one', 'I now own this in three colours. Two winters in, the first one still looks new.', TRUE, '2026-08-13T09:08:33.547Z'),
(14, 6, NULL, 'Anita V.', 'Berlin, DE', 5, 'Not itchy at all', 'I have very reactive skin and this is the only cashmere I can wear against bare skin.', TRUE, '2026-08-05T09:08:33.547Z'),
(15, 6, NULL, 'Lucia P.', 'Buenos Aires, AR', 4, 'Size up for slouch', 'True to size, but I like it oversized so I went up one and it''s perfect.', TRUE, '2026-07-02T09:08:33.547Z'),
(16, 7, NULL, 'Rosa M.', 'Madrid, ES', 5, 'The perfect base layer', 'Disappears under a blazer and the collar doesn''t slouch. I''m on my second.', TRUE, '2026-08-30T09:08:33.547Z'),
(17, 7, NULL, 'Julia N.', 'Warsaw, PL', 4, 'Great, slightly sheer', 'In Optic White it needs a skin-tone bra. Navy is fully opaque.', TRUE, '2026-07-26T09:08:33.547Z'),
(18, 8, NULL, 'Freya L.', 'Reykjavik, IS', 5, 'My whole winter', 'Enormous, cosy and the Ivory colour is beautiful. Wears like a coat indoors.', TRUE, '2026-08-19T09:08:33.547Z'),
(19, 8, NULL, 'Mark J.', 'Portland, US', 5, 'Bought the Moss', 'Great neutral green, not too bright. Buttons feel solid.', TRUE, '2026-07-06T09:08:33.547Z'),
(20, 9, NULL, 'Callum R.', 'Edinburgh, UK', 5, 'Proper jumper', 'Heavy, warm and the lanolin smell is oddly nostalgic. Exactly what I hoped for.', TRUE, '2026-09-07T09:08:33.547Z'),
(21, 9, NULL, 'Theo K.', 'Vancouver, CA', 4, 'Chunky', 'Very substantial knit — a real winter piece rather than a layering one.', TRUE, '2026-08-17T09:08:33.547Z'),
(22, 10, NULL, 'Wei C.', 'Taipei, TW', 5, 'Zero break-in', 'Wore them for a 12-hour travel day straight out of the box. No blisters, no heel slip.', TRUE, '2026-08-10T09:08:33.547Z'),
(23, 10, NULL, 'Sasha G.', 'Brooklyn, US', 5, 'The white sneaker, done right', 'Clean toe box, no branding, and the leather has started to patina beautifully.', TRUE, '2026-07-30T09:08:33.547Z'),
(24, 10, NULL, 'Omar D.', 'Casablanca, MA', 4, 'Narrow-ish', 'Slightly narrow through the midfoot. Fine for me, but wide-footed friends should size up.', TRUE, '2026-05-21T09:08:33.547Z'),
(25, 11, NULL, 'Lena S.', 'Amsterdam, NL', 5, 'City miles', 'Bouncy but stable. I''ve done 300km including cobblestones and the foam still feels new.', TRUE, '2026-08-12T09:08:33.547Z'),
(26, 11, NULL, 'Ravi P.', 'Bengaluru, IN', 5, 'Breathes in 32°C', 'The knit is genuinely airy. No hot spots.', TRUE, '2026-08-09T09:08:33.547Z'),
(27, 12, NULL, 'Nina B.', 'Seoul, KR', 5, 'Photos don''t do the colour', 'The Cobalt is electric in person. Got stopped twice on the first day.', TRUE, '2026-08-21T09:08:33.547Z'),
(28, 12, NULL, 'Jonas E.', 'Hamburg, DE', 4, 'Fun shoe', 'Comfortable straight away. Suede marks easily, so treat it.', TRUE, '2026-08-07T09:08:33.547Z'),
(29, 13, NULL, 'Amélie R.', 'Paris, FR', 5, 'Paris-proof', 'Survived a week of rain on paving stones with zero slipping. The leather is thick and gorgeous.', TRUE, '2026-08-23T09:08:33.547Z'),
(30, 13, NULL, 'Grace T.', 'Sydney, AU', 5, 'Elegant and tough', 'Rare to find a lug sole that doesn''t look clunky. These read sleek under trousers.', TRUE, '2026-08-09T09:08:33.547Z'),
(31, 13, NULL, 'Mira H.', 'Stockholm, SE', 4, 'Stiff at first', 'Three wears to break in, then excellent. Order your usual size.', TRUE, '2026-07-02T09:08:33.547Z'),
(32, 14, NULL, 'Bianca F.', 'New York, US', 5, 'No zip, no gaping', 'They actually stay up on my calves, which never happens. Wore them for 10 hours at a trade show.', TRUE, '2026-08-21T09:08:33.547Z'),
(33, 14, NULL, 'Aiko M.', 'Osaka, JP', 5, 'Sculptural', 'The heel is a work of art. Comfortable for a 60mm boot.', TRUE, '2026-08-11T09:08:33.547Z'),
(34, 15, NULL, 'Léa C.', 'Geneva, CH', 5, 'Moulds to your foot', 'Unlined leather sounds odd but after a week it felt custom-made.', TRUE, '2026-08-10T09:08:33.547Z'),
(35, 15, NULL, 'Peter V.', 'Auckland, NZ', 4, 'Great, size down', 'Definitely half a size large. The Optic White is crisp and clean.', TRUE, '2026-07-16T09:08:33.547Z'),
(36, 16, NULL, 'Stella M.', 'Los Angeles, US', 5, 'Actually opaque', 'The 22-momme weight makes all the difference — no underwear show-through, and it doesn''t crease like cheaper silk.', TRUE, '2026-08-30T09:08:33.547Z'),
(37, 16, NULL, 'Farah K.', 'Doha, QA', 5, 'Wedding guest winner', 'Wore the Bordeaux to a wedding, packed it in a carry-on and it came out without a crease.', TRUE, '2026-07-26T09:08:33.547Z'),
(38, 16, NULL, 'Ivy L.', 'London, UK', 4, 'Long on petite frames', 'Gorgeous, but I''m 5''3" and it''s ankle length. Had it shortened 6cm.', TRUE, '2026-05-15T09:08:33.547Z'),
(39, 17, NULL, 'Marta G.', 'Barcelona, ES', 5, 'Summer uniform', 'Lives in my suitcase from May to September. Breathes beautifully at 35°C.', TRUE, '2026-08-21T09:08:33.547Z'),
(40, 17, NULL, 'Ellie W.', 'Cape Town, ZA', 4, 'Lovely, creases', 'It''s linen, so it creases — but that''s the look. The Optic White is beautifully crisp.', TRUE, '2026-08-11T09:08:33.547Z'),
(41, 18, NULL, 'Chloe A.', 'Sydney, AU', 5, 'Wore it to a gala', 'Three people asked who made it. The internal boning means no bra, no fuss.', TRUE, '2026-09-03T09:08:33.547Z'),
(42, 18, NULL, 'Noor S.', 'Amman, JO', 5, 'Sculpted', 'The crepe holds you in without being tight. True to size.', TRUE, '2026-07-18T09:08:33.547Z'),
(43, 19, NULL, 'Zoe H.', 'Austin, US', 5, 'The Rose colour', 'Somewhere between blush and mauve — far more sophisticated than the photos suggest.', TRUE, '2026-09-03T09:08:33.547Z'),
(44, 19, NULL, 'Isabel R.', 'Mexico City, MX', 4, 'Needs heels', 'Very long, so plan on heels or a hem. Beautiful drape.', TRUE, '2026-08-15T09:08:33.547Z'),
(45, 20, NULL, 'Helen Z.', 'Singapore, SG', 5, 'Office to dinner', 'The waist is properly nipped so it doesn''t look boxy over a dress. Excellent in humid weather.', TRUE, '2026-09-04T09:08:33.547Z'),
(46, 20, NULL, 'Dana Q.', 'Dublin, IE', 5, 'Best tailoring I own', 'The shoulder line is perfect. I''ve had it taken in slightly at the waist for a made-to-measure feel.', TRUE, '2026-07-10T09:08:33.547Z'),
(47, 21, NULL, 'Tara N.', 'Toronto, CA', 5, 'Finally, a wide leg that works', 'I''m 5''2" and these don''t drown me with a 3cm heel. The drape is beautiful.', TRUE, '2026-08-27T09:08:33.547Z'),
(48, 21, NULL, 'Sara K.', 'Dubai, AE', 4, 'Great fabric', 'Doesn''t wrinkle on long flights. Needed a belt as the waist runs slightly big.', TRUE, '2026-06-20T09:08:33.547Z'),
(49, 22, NULL, 'Kate O.', 'Auckland, NZ', 5, 'Bought five', 'The neck hasn''t stretched after months of washing. Worth the price over cheap tees.', TRUE, '2026-08-01T09:08:33.547Z'),
(50, 22, NULL, 'Ben A.', 'Berlin, DE', 5, 'Perfect weight', 'Not see-through, not stiff. The Sage is a great soft green.', TRUE, '2026-08-21T09:08:33.547Z'),
(51, 22, NULL, 'Rina D.', 'Jakarta, ID', 4, 'Good, boxy fit', 'Very boxy through the body. I sized down and love it.', TRUE, '2026-08-25T09:08:33.547Z'),
(52, 23, NULL, 'Vivian L.', 'Hong Kong, HK', 5, 'Stays put', 'Danced for four hours without once pulling it up. That never happens with a strapless.', TRUE, '2026-08-20T09:08:33.547Z'),
(53, 23, NULL, 'Camille R.', 'Montreal, CA', 5, 'Sculptural', 'Looks like couture from the front and the back. Very flattering.', TRUE, '2026-08-15T09:08:33.547Z'),
(54, 24, NULL, 'Hiro S.', 'Okayama, JP', 5, 'The real thing', 'Proper shuttle-loom denim. Heavy, slubby and it''s already starting to fade at the elbows.', TRUE, '2026-08-04T09:08:33.547Z'),
(55, 24, NULL, 'Maya J.', 'Berlin, DE', 4, 'Size up', 'Very boxy. I sized up for layering and it''s perfect over the Cloudsoft crew.', TRUE, '2026-08-31T09:08:33.547Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscribers (id, email, created_at) VALUES
(1, 'test@example.com', '2026-09-12T09:09:27.969Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO discount_codes (id, code, label, type, value, scope, scope_value, min_subtotal_cents, max_redemptions, redeemed_count, starts_at, ends_at, active, created_at) VALUES
(1, 'NOVAWELCOME', 'Welcome offer', 'percent', 10, 'all', '', 0, 500, 1, NULL, NULL, TRUE, '2026-09-12T09:09:09.107Z'),
(2, 'FOOTWEAR20', 'Footwear campaign', 'percent', 20, 'category', 'Footwear', 0, NULL, 2, NULL, NULL, TRUE, '2026-09-12T09:09:09.107Z'),
(3, 'ESSENTIAL25', 'Essentials bundle', 'fixed', 2500, 'collection', 'elevated-essentials', 30000, 100, 0, NULL, NULL, TRUE, '2026-09-12T09:09:09.107Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, order_number, email, full_name, address1, address2, city, region, postal_code, country, phone, shipping_method, currency, fx_rate, subtotal_cents, shipping_cents, tax_cents, customer_id, tracking_number, discount_code, discount_cents, total_cents, status, created_at) VALUES
(1, 'NVA-YAFN8W', 'client@nova.com', 'Amelie Laurent', '18 Rue de Turenne', '', 'Paris', '', '75003', 'France', '', 'standard', 'USD', 1, 54000, 0, 0, 1, '', 'NOVAWELCOME', 5400, 48600, 'confirmed', '2026-09-12T09:09:53.249Z'),
(2, 'NVA-AMJZW8', 'client@nova.com', 'Amelie Laurent', '18 Rue de Turenne', '', 'Paris', '', '75003', 'France', '', 'standard', 'USD', 1, 54000, 0, 0, 1, '', 'NOVAGC-TEST01', 20000, 34000, 'confirmed', '2026-09-12T11:06:29.642Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, product_id, slug, name, image, size, color, quantity, unit_price_cents, line_total_cents) VALUES
(1, 1, 2, 'meridian-cotton-trench', 'Meridian Cotton Trench', 'https://images.pexels.com/photos/19099688/pexels-photo-19099688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330', 'M', 'Optic White', 1, 54000, 54000),
(2, 2, 2, 'meridian-cotton-trench', 'Meridian Cotton Trench', 'https://images.pexels.com/photos/19099688/pexels-photo-19099688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330', 'XS', 'Optic White', 1, 54000, 54000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_events (id, order_id, status, note, created_at) VALUES
(1, 1, 'confirmed', 'We have your order and payment.', '2026-09-12T09:09:53.249Z'),
(2, 2, 'confirmed', 'We have your order and payment.', '2026-09-12T11:06:29.642Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_settings (key, value, updated_at) VALUES
('promo_enabled', 'true', '2026-09-12T09:57:02.717Z')
ON CONFLICT (key) DO NOTHING;

-- favourites: no rows

INSERT INTO currency_rules (code, fx_rate, markup_percent, rounding, active, updated_at) VALUES
('EUR', 0.92, 5, 'nearest_9', TRUE, '2026-09-12T11:06:07.191Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO gift_cards (id, code, initial_cents, balance_cents, note, active, created_at, updated_at) VALUES
(1, 'NOVAGC-TEST01', 21500, 1500, 'test card', TRUE, '2026-09-12T11:06:07.147Z', '2026-09-12T11:08:41.083Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (id, email, name, role, active, last_login_at, created_at) VALUES
(1, 'maya@nova.com', 'Maya Fernando', 'stock_manager', TRUE, NULL, '2026-09-12T11:26:00.580Z'),
(2, 'abc@gmail.com', 'navidu', 'stock_manager', TRUE, '2026-09-12T12:40:28.064Z', '2026-09-12T12:40:07.000Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES
('help', 'Help Centre', 'Client care', 'Everything you need before and after an order — answered by the same team that packs your parcel in Rotterdam.', '[{"body":["Orders are confirmed by email within minutes and enter the atelier queue the same working day. You can follow every step from your account, from confirmation to delivery.","If a size or colourway is showing as unavailable, join the waitlist from the product page — restocks are announced to that list first."],"heading":"Ordering"},{"body":["We accept Visa, Mastercard, American Express, PayPal, Apple Pay and Klarna. Card details are entered at checkout and are never stored on your account.","Prices are shown in your chosen currency for guidance; the charge is settled in USD at your bank''s rate."],"heading":"Payment"},{"body":["Standard express shipping is complimentary on every order and arrives within three to five working days to 94 countries, duties and taxes included.","Priority shipping is available at checkout and moves your order to the front of the packing queue."],"heading":"Delivery"},{"body":["Write to the studio from the contact page and a client adviser replies within one working day, in English, French, German or Sinhala."],"heading":"Still need us?"}]', TRUE, 1, '2026-09-12T10:54:58.432Z'),
('contact', 'Contact Us', 'We are listening', 'A client adviser reads every message personally. Write to us about sizing, deliveries, repairs or a piece you are searching for.', '[{"body":["Monday to Friday, 09:00 – 18:00 CET. Replies land within one working day."],"heading":"Client services"},{"body":["Our Rotterdam atelier welcomes clients by appointment for fittings and repairs. Write to us and we will arrange a time."],"heading":"Studio visits"}]', TRUE, 2, '2026-09-12T10:54:58.432Z'),
('shipping', 'Global Shipping', 'Worldwide, duties included', 'Express delivery to 94 countries from our Rotterdam and Singapore hubs, with duties and taxes settled at checkout.', '[{"body":["Standard express is complimentary on every order and arrives in three to five working days. Priority shipping is available at checkout for next-working-day dispatch to most cities."],"heading":"Rates and speeds"},{"body":["The price you pay at checkout is final. We prepay import duties and taxes for every destination we serve, so nothing is collected on your doorstep."],"heading":"Duties and taxes"},{"body":["Every parcel ships with a DHL or UPS tracking number, visible in your account from the moment it leaves the atelier."],"heading":"Tracking"}]', TRUE, 3, '2026-09-12T10:54:58.432Z'),
('returns', 'Returns & Exchanges', 'Thirty days, prepaid', 'Try everything on at home. If a piece is not right, return it within thirty days with a prepaid label.', '[{"body":["You have thirty days from delivery to start a return or exchange. Pieces should be unworn with their tags and original packaging."],"heading":"The window"},{"body":["Open your account, choose the order and select the pieces you are sending back. A prepaid label arrives by email instantly. Refunds are issued within three working days of arrival at the studio."],"heading":"How it works"},{"body":["Size and colour exchanges are free. We hold your new size for seven days while your parcel travels back to us."],"heading":"Exchanges"}]', TRUE, 4, '2026-09-12T10:54:58.432Z'),
('size-guide', 'Size Guide', 'Measure once', 'Our pieces are cut in European sizing. Measure a garment you already love and match it to the tables below.', '[{"body":["Chest is measured flat across the fullest point, doubled. Length is from the highest shoulder point to the hem. If you sit between two sizes, take the larger for tailoring and the smaller for knitwear."],"heading":"Knitwear and tailoring"},{"body":["Our Porto-made shoes run true to Brannock size. If you are between sizes, we recommend the half size down for loafers and the half size up for boots worn with socks."],"heading":"Footwear"},{"body":["Write to us from the contact page with your usual sizes in other houses and a client adviser will map them for you."],"heading":"Still unsure?"}]', TRUE, 5, '2026-09-12T10:54:58.432Z'),
('product-care', 'Product Care', 'Repaired, not replaced', 'Every piece is made to be kept. Free stitching and resoling on all footwear for the life of the shoe.', '[{"body":["Hand wash cool with a pH-neutral soap, or dry clean. Dry flat away from direct heat. Store folded with cedar, never on a hanger."],"heading":"Cashmere and merino"},{"body":["Machine wash at thirty degrees on a gentle cycle and hang to dry. Press on the reverse while slightly damp for a crisp finish."],"heading":"Cotton and linen"},{"body":["Brush off dust after wear, condition every few months with a neutral cream, and rest your shoes on cedar trees between wears."],"heading":"Leather footwear"}]', TRUE, 6, '2026-09-12T10:54:58.432Z'),
('privacy', 'Privacy Policy', 'Your data', 'We collect the minimum we need to send you beautiful things, and we never sell it.', '[{"body":["Your name, delivery address, email and order history. Payment card details are entered at checkout and processed by our payment partners — they are never stored on your account or on our servers."],"heading":"What we collect"},{"body":["To make and deliver your orders, to answer your messages, and — only if you ask — to send you our newsletter. Analytics are aggregated and anonymous."],"heading":"How we use it"},{"body":["You may request a copy of your data, correct it, or have your account deleted at any time. Write to us from the contact page and we action every request within thirty days."],"heading":"Your rights"},{"body":["A strictly necessary cookie keeps your session and bag. Analytics cookies only run with your consent, and your theme and currency preferences are kept on your own device."],"heading":"Cookies"}]', TRUE, 7, '2026-09-12T10:54:58.432Z'),
('terms', 'Terms & Conditions', 'The agreement', 'The terms of sale for every order placed with Nova Global Commerce.', '[{"body":["An order is an offer to buy. The contract forms when we confirm dispatch. Prices are shown in your chosen currency and settled in USD; a price is only binding once your order is confirmed."],"heading":"Orders and pricing"},{"body":["Risk passes to you on delivery. If a parcel arrives damaged, photograph the packaging and write to us within seven days and we will replace the piece."],"heading":"Delivery and title"},{"body":["You have thirty days from delivery to return unworn pieces for a full refund. The statutory right of withdrawal is unaffected by these terms."],"heading":"Returns"},{"body":["Our liability is limited to the value of the affected order. Nothing in these terms limits liability for death, personal injury or fraud."],"heading":"Liability"}]', TRUE, 8, '2026-09-12T10:54:58.432Z'),
('accessibility', 'Accessibility', 'For everyone', 'A store should be as easy to use as it is beautiful. Here is where we stand and where we are going.', '[{"body":["The storefront is built to WCAG 2.1 AA: keyboard navigation across every page, visible focus states, alt text on product imagery, and colour contrast checked in both light and dark themes.","The interface respects your motion preferences and never relies on colour alone to convey meaning."],"heading":"What we do today"},{"body":["Full screen-reader labelling for the checkout flow and transcripts for our campaign films are in progress."],"heading":"What we are working on"},{"body":["If anything on this site is hard to use, write to us from the contact page. Every message is read by a person and shapes what we fix next."],"heading":"Tell us what you need"}]', TRUE, 9, '2026-09-12T10:54:58.432Z'),
('materials', 'Our Materials', 'The source', 'Fibres and leathers chosen slowly, from mills we visit three times a year.', '[{"body":["Two-ply, grade-A cashmere from Inner Mongolia, spun in Biella. Long fibres mean less pilling and a hand that softens with age."],"heading":"Cashmere"},{"body":["Selvedge denim woven on shuttle looms in Okayama, sanforised so the fit you buy is the fit you keep."],"heading":"Denim"},{"body":["Vegetable-tanned calf and suede from certified tanneries in Tuscany, chosen for the way they patina rather than wear out."],"heading":"Leather"}]', TRUE, 10, '2026-09-12T10:54:58.432Z'),
('responsibility', 'Responsibility', 'Made to be kept', 'Small runs, honest materials and repairs instead of landfill.', '[{"body":["Between 150 and 600 units per colourway. Nothing is made to sit in a warehouse, and nothing is destroyed at the end of a season."],"heading":"Small-run manufacturing"},{"body":["Free stitching and resoling on all footwear for the life of the shoe. Bring a piece back and we will bring it back."],"heading":"Repair for life"},{"body":["Recycled and recyclable boxes, paper tape and no plastic windows. Our garment bags are compostable cornstarch."],"heading":"Packaging"}]', TRUE, 11, '2026-09-12T10:54:58.432Z'),
('ateliers', 'Ateliers & Mills', 'The makers', 'Four workshops and three mills, visited three times a year, on a first-name basis.', '[{"body":["Where our cashmere and merino are spun. The mill has been family-run since 1663 and still washes its yarn in Alpine water."],"heading":"Biella, Italy"},{"body":["Shuttle looms running at a third of modern speed, weaving the selvedge denim for our five-pocket jean."],"heading":"Okayama, Japan"},{"body":["The footwear atelier. Each pair passes through sixty pairs of hands before it is boxed."],"heading":"Porto, Portugal"}]', TRUE, 12, '2026-09-12T10:54:58.432Z'),
('careers', 'Careers', 'Join the house', 'A small team, working slowly and well. We hire for curiosity and keep people for decades.', '[{"body":["Studio-first, hybrid where the role allows. Everyone in the company, including the founders, spends one week a season on the client services desk."],"heading":"How we work"},{"body":["We post new roles here as they open. If nothing fits, write to us from the contact page with a note about what you make and how you work."],"heading":"Open roles"}]', TRUE, 13, '2026-09-12T10:54:58.432Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contact_messages (id, name, email, subject, message, handled, created_at) VALUES
(1, 'Amelie Laurent', 'client@nova.com', 'Sizing advice', 'Could you tell me the chest measurement on the trench in a size M?', FALSE, '2026-09-12T10:55:38.457Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, color, size, stock, updated_at) VALUES
(1, 1, 'Optic White', 'XS', 2, '2026-09-12T09:08:53.569Z'),
(2, 1, 'Optic White', 'S', 2, '2026-09-12T09:08:53.569Z'),
(3, 1, 'Optic White', 'M', 2, '2026-09-12T09:08:53.569Z'),
(4, 1, 'Optic White', 'L', 0, '2026-09-12T09:08:53.569Z'),
(5, 1, 'Optic White', 'XL', 1, '2026-09-12T09:08:53.569Z'),
(6, 1, 'Ivory', 'XS', 1, '2026-09-12T09:08:53.569Z'),
(7, 1, 'Ivory', 'S', 1, '2026-09-12T09:08:53.569Z'),
(8, 1, 'Ivory', 'M', 1, '2026-09-12T09:08:53.569Z'),
(9, 1, 'Ivory', 'L', 0, '2026-09-12T09:08:53.569Z'),
(10, 1, 'Ivory', 'XL', 1, '2026-09-12T09:08:53.569Z'),
(11, 1, 'Black', 'XS', 1, '2026-09-12T09:08:53.569Z'),
(12, 1, 'Black', 'S', 1, '2026-09-12T09:08:53.569Z'),
(13, 1, 'Black', 'M', 1, '2026-09-12T09:08:53.569Z'),
(14, 1, 'Black', 'L', 0, '2026-09-12T09:08:53.569Z'),
(15, 1, 'Black', 'XL', 1, '2026-09-12T09:08:53.569Z'),
(16, 1, 'Charcoal', 'XS', 1, '2026-09-12T09:08:53.569Z'),
(17, 1, 'Charcoal', 'S', 1, '2026-09-12T09:08:53.569Z'),
(18, 1, 'Charcoal', 'M', 1, '2026-09-12T09:08:53.569Z'),
(19, 1, 'Charcoal', 'L', 0, '2026-09-12T09:08:53.569Z'),
(20, 1, 'Charcoal', 'XL', 1, '2026-09-12T09:08:53.569Z'),
(21, 2, 'Optic White', 'XS', 2, '2026-09-12T11:06:29.639Z'),
(22, 2, 'Optic White', 'S', 2, '2026-09-12T09:08:53.594Z'),
(23, 2, 'Optic White', 'M', 1, '2026-09-12T09:09:53.246Z'),
(24, 2, 'Optic White', 'L', 0, '2026-09-12T09:08:53.594Z'),
(25, 2, 'Optic White', 'XL', 2, '2026-09-12T09:08:53.594Z'),
(26, 2, 'Black', 'XS', 2, '2026-09-12T09:08:53.594Z'),
(27, 2, 'Black', 'S', 2, '2026-09-12T09:08:53.594Z'),
(28, 2, 'Black', 'M', 2, '2026-09-12T09:08:53.594Z'),
(29, 2, 'Black', 'L', 0, '2026-09-12T09:08:53.594Z'),
(30, 2, 'Black', 'XL', 2, '2026-09-12T09:08:53.594Z'),
(31, 2, 'Graphite', 'XS', 2, '2026-09-12T09:08:53.594Z'),
(32, 2, 'Graphite', 'S', 2, '2026-09-12T09:08:53.594Z'),
(33, 2, 'Graphite', 'M', 2, '2026-09-12T09:08:53.594Z'),
(34, 2, 'Graphite', 'L', 0, '2026-09-12T09:08:53.594Z'),
(35, 2, 'Graphite', 'XL', 2, '2026-09-12T09:08:53.594Z'),
(36, 3, 'Optic White', 'XS', 2, '2026-09-12T09:08:53.617Z'),
(37, 3, 'Optic White', 'S', 2, '2026-09-12T09:08:53.617Z'),
(38, 3, 'Optic White', 'M', 2, '2026-09-12T09:08:53.617Z'),
(39, 3, 'Optic White', 'L', 0, '2026-09-12T09:08:53.617Z'),
(40, 3, 'Optic White', 'XL', 1, '2026-09-12T09:08:53.617Z'),
(41, 3, 'Ivory', 'XS', 1, '2026-09-12T09:08:53.617Z'),
(42, 3, 'Ivory', 'S', 1, '2026-09-12T09:08:53.617Z'),
(43, 3, 'Ivory', 'M', 1, '2026-09-12T09:08:53.617Z'),
(44, 3, 'Ivory', 'L', 0, '2026-09-12T09:08:53.617Z'),
(45, 3, 'Ivory', 'XL', 1, '2026-09-12T09:08:53.617Z'),
(46, 3, 'Black', 'XS', 1, '2026-09-12T09:08:53.617Z'),
(47, 3, 'Black', 'S', 1, '2026-09-12T09:08:53.617Z'),
(48, 3, 'Black', 'M', 1, '2026-09-12T09:08:53.617Z'),
(49, 3, 'Black', 'L', 0, '2026-09-12T09:08:53.617Z'),
(50, 3, 'Black', 'XL', 1, '2026-09-12T09:08:53.617Z'),
(51, 4, 'Graphite', 'S', 1, '2026-09-12T09:08:53.638Z'),
(52, 4, 'Graphite', 'M', 1, '2026-09-12T09:08:53.638Z'),
(53, 4, 'Graphite', 'L', 1, '2026-09-12T09:08:53.638Z'),
(54, 4, 'Graphite', 'XL', 0, '2026-09-12T09:08:53.638Z'),
(55, 4, 'Graphite', 'XXL', 1, '2026-09-12T09:08:53.638Z'),
(56, 4, 'Charcoal', 'S', 1, '2026-09-12T09:08:53.638Z'),
(57, 4, 'Charcoal', 'M', 1, '2026-09-12T09:08:53.638Z'),
(58, 4, 'Charcoal', 'L', 1, '2026-09-12T09:08:53.638Z'),
(59, 4, 'Charcoal', 'XL', 0, '2026-09-12T09:08:53.638Z'),
(60, 4, 'Charcoal', 'XXL', 1, '2026-09-12T09:08:53.638Z'),
(61, 4, 'Black', 'S', 1, '2026-09-12T09:08:53.638Z'),
(62, 4, 'Black', 'M', 1, '2026-09-12T09:08:53.638Z'),
(63, 4, 'Black', 'L', 1, '2026-09-12T09:08:53.638Z'),
(64, 4, 'Black', 'XL', 0, '2026-09-12T09:08:53.638Z'),
(65, 4, 'Black', 'XXL', 1, '2026-09-12T09:08:53.638Z'),
(66, 4, 'Optic White', 'S', 1, '2026-09-12T09:08:53.638Z'),
(67, 4, 'Optic White', 'M', 1, '2026-09-12T09:08:53.638Z'),
(68, 4, 'Optic White', 'L', 1, '2026-09-12T09:08:53.638Z'),
(69, 4, 'Optic White', 'XL', 0, '2026-09-12T09:08:53.638Z'),
(70, 4, 'Optic White', 'XXL', 1, '2026-09-12T09:08:53.638Z'),
(71, 5, 'Black', 'S', 2, '2026-09-12T09:08:53.658Z'),
(72, 5, 'Black', 'M', 2, '2026-09-12T09:08:53.658Z'),
(73, 5, 'Black', 'L', 2, '2026-09-12T09:08:53.658Z'),
(74, 5, 'Black', 'XL', 0, '2026-09-12T09:08:53.658Z'),
(75, 5, 'Black', 'XXL', 2, '2026-09-12T09:08:53.658Z'),
(76, 5, 'Charcoal', 'S', 2, '2026-09-12T09:08:53.658Z'),
(77, 5, 'Charcoal', 'M', 2, '2026-09-12T09:08:53.658Z'),
(78, 5, 'Charcoal', 'L', 2, '2026-09-12T09:08:53.658Z'),
(79, 5, 'Charcoal', 'XL', 0, '2026-09-12T09:08:53.658Z'),
(80, 5, 'Charcoal', 'XXL', 2, '2026-09-12T09:08:53.658Z'),
(81, 5, 'Graphite', 'S', 2, '2026-09-12T09:08:53.658Z'),
(82, 5, 'Graphite', 'M', 2, '2026-09-12T09:08:53.658Z'),
(83, 5, 'Graphite', 'L', 1, '2026-09-12T09:08:53.658Z'),
(84, 5, 'Graphite', 'XL', 0, '2026-09-12T09:08:53.658Z'),
(85, 5, 'Graphite', 'XXL', 1, '2026-09-12T09:08:53.658Z'),
(86, 6, 'Optic White', 'XS', 3, '2026-09-12T09:08:53.681Z'),
(87, 6, 'Optic White', 'S', 3, '2026-09-12T09:08:53.681Z'),
(88, 6, 'Optic White', 'M', 2, '2026-09-12T09:08:53.681Z'),
(89, 6, 'Optic White', 'L', 0, '2026-09-12T09:08:53.681Z'),
(90, 6, 'Optic White', 'XL', 2, '2026-09-12T09:08:53.681Z'),
(91, 6, 'Ivory', 'XS', 2, '2026-09-12T09:08:53.681Z'),
(92, 6, 'Ivory', 'S', 2, '2026-09-12T09:08:53.681Z'),
(93, 6, 'Ivory', 'M', 2, '2026-09-12T09:08:53.681Z'),
(94, 6, 'Ivory', 'L', 0, '2026-09-12T09:08:53.681Z'),
(95, 6, 'Ivory', 'XL', 2, '2026-09-12T09:08:53.681Z'),
(96, 6, 'Charcoal', 'XS', 2, '2026-09-12T09:08:53.681Z'),
(97, 6, 'Charcoal', 'S', 2, '2026-09-12T09:08:53.681Z'),
(98, 6, 'Charcoal', 'M', 2, '2026-09-12T09:08:53.681Z'),
(99, 6, 'Charcoal', 'L', 0, '2026-09-12T09:08:53.681Z'),
(100, 6, 'Charcoal', 'XL', 2, '2026-09-12T09:08:53.681Z'),
(101, 6, 'Black', 'XS', 2, '2026-09-12T09:08:53.681Z'),
(102, 6, 'Black', 'S', 2, '2026-09-12T09:08:53.681Z'),
(103, 6, 'Black', 'M', 2, '2026-09-12T09:08:53.681Z'),
(104, 6, 'Black', 'L', 0, '2026-09-12T09:08:53.681Z'),
(105, 6, 'Black', 'XL', 2, '2026-09-12T09:08:53.681Z'),
(106, 7, 'Optic White', 'XS', 4, '2026-09-12T09:08:53.700Z'),
(107, 7, 'Optic White', 'S', 4, '2026-09-12T09:08:53.700Z'),
(108, 7, 'Optic White', 'M', 4, '2026-09-12T09:08:53.700Z'),
(109, 7, 'Optic White', 'L', 0, '2026-09-12T09:08:53.700Z'),
(110, 7, 'Optic White', 'XL', 4, '2026-09-12T09:08:53.700Z'),
(111, 7, 'Black', 'XS', 4, '2026-09-12T09:08:53.700Z'),
(112, 7, 'Black', 'S', 4, '2026-09-12T09:08:53.700Z'),
(113, 7, 'Black', 'M', 4, '2026-09-12T09:08:53.700Z'),
(114, 7, 'Black', 'L', 0, '2026-09-12T09:08:53.700Z'),
(115, 7, 'Black', 'XL', 4, '2026-09-12T09:08:53.700Z'),
(116, 7, 'Navy', 'XS', 4, '2026-09-12T09:08:53.700Z'),
(117, 7, 'Navy', 'S', 3, '2026-09-12T09:08:53.700Z'),
(118, 7, 'Navy', 'M', 3, '2026-09-12T09:08:53.700Z'),
(119, 7, 'Navy', 'L', 0, '2026-09-12T09:08:53.700Z'),
(120, 7, 'Navy', 'XL', 3, '2026-09-12T09:08:53.700Z'),
(121, 8, 'Optic White', 'S', 3, '2026-09-12T09:08:53.718Z'),
(122, 8, 'Optic White', 'M', 3, '2026-09-12T09:08:53.718Z'),
(123, 8, 'Optic White', 'L', 3, '2026-09-12T09:08:53.718Z'),
(124, 8, 'Ivory', 'S', 0, '2026-09-12T09:08:53.718Z'),
(125, 8, 'Ivory', 'M', 3, '2026-09-12T09:08:53.718Z'),
(126, 8, 'Ivory', 'L', 3, '2026-09-12T09:08:53.718Z'),
(127, 8, 'Black', 'S', 3, '2026-09-12T09:08:53.718Z'),
(128, 8, 'Black', 'M', 3, '2026-09-12T09:08:53.718Z'),
(129, 8, 'Black', 'L', 0, '2026-09-12T09:08:53.718Z'),
(130, 8, 'Moss', 'S', 2, '2026-09-12T09:08:53.718Z'),
(131, 8, 'Moss', 'M', 2, '2026-09-12T09:08:53.718Z'),
(132, 8, 'Moss', 'L', 2, '2026-09-12T09:08:53.718Z'),
(133, 9, 'Optic White', 'S', 2, '2026-09-12T09:08:53.734Z'),
(134, 9, 'Optic White', 'M', 2, '2026-09-12T09:08:53.734Z'),
(135, 9, 'Optic White', 'L', 2, '2026-09-12T09:08:53.734Z'),
(136, 9, 'Optic White', 'XL', 0, '2026-09-12T09:08:53.734Z'),
(137, 9, 'Optic White', 'XXL', 2, '2026-09-12T09:08:53.734Z'),
(138, 9, 'Charcoal', 'S', 2, '2026-09-12T09:08:53.734Z'),
(139, 9, 'Charcoal', 'M', 2, '2026-09-12T09:08:53.734Z'),
(140, 9, 'Charcoal', 'L', 2, '2026-09-12T09:08:53.734Z'),
(141, 9, 'Charcoal', 'XL', 0, '2026-09-12T09:08:53.734Z'),
(142, 9, 'Charcoal', 'XXL', 2, '2026-09-12T09:08:53.734Z'),
(143, 9, 'Navy', 'S', 2, '2026-09-12T09:08:53.734Z'),
(144, 9, 'Navy', 'M', 2, '2026-09-12T09:08:53.734Z'),
(145, 9, 'Navy', 'L', 2, '2026-09-12T09:08:53.734Z'),
(146, 9, 'Navy', 'XL', 0, '2026-09-12T09:08:53.734Z'),
(147, 9, 'Navy', 'XXL', 1, '2026-09-12T09:08:53.734Z'),
(148, 10, 'Optic White', '40', 3, '2026-09-12T09:08:53.752Z'),
(149, 10, 'Optic White', '41', 3, '2026-09-12T09:08:53.752Z'),
(150, 10, 'Optic White', '42', 3, '2026-09-12T09:08:53.752Z'),
(151, 10, 'Optic White', '43', 0, '2026-09-12T09:08:53.752Z'),
(152, 10, 'Optic White', '44', 3, '2026-09-12T09:08:53.752Z'),
(153, 10, 'Optic White', '45', 3, '2026-09-12T09:08:53.752Z'),
(154, 10, 'Ivory', '40', 3, '2026-09-12T09:08:53.752Z'),
(155, 10, 'Ivory', '41', 3, '2026-09-12T09:08:53.752Z'),
(156, 10, 'Ivory', '42', 0, '2026-09-12T09:08:53.752Z'),
(157, 10, 'Ivory', '43', 3, '2026-09-12T09:08:53.752Z'),
(158, 10, 'Ivory', '44', 3, '2026-09-12T09:08:53.752Z'),
(159, 10, 'Ivory', '45', 3, '2026-09-12T09:08:53.752Z'),
(160, 10, 'Black', '40', 2, '2026-09-12T09:08:53.752Z'),
(161, 10, 'Black', '41', 0, '2026-09-12T09:08:53.752Z'),
(162, 10, 'Black', '42', 2, '2026-09-12T09:08:53.752Z'),
(163, 10, 'Black', '43', 2, '2026-09-12T09:08:53.752Z'),
(164, 10, 'Black', '44', 2, '2026-09-12T09:08:53.752Z'),
(165, 10, 'Black', '45', 2, '2026-09-12T09:08:53.752Z'),
(166, 11, 'Optic White', '40', 4, '2026-09-12T09:08:53.768Z'),
(167, 11, 'Optic White', '41', 4, '2026-09-12T09:08:53.768Z'),
(168, 11, 'Optic White', '42', 4, '2026-09-12T09:08:53.768Z'),
(169, 11, 'Optic White', '43', 0, '2026-09-12T09:08:53.768Z'),
(170, 11, 'Optic White', '44', 4, '2026-09-12T09:08:53.768Z'),
(171, 11, 'Optic White', '45', 4, '2026-09-12T09:08:53.768Z'),
(172, 11, 'Graphite', '40', 4, '2026-09-12T09:08:53.768Z'),
(173, 11, 'Graphite', '41', 3, '2026-09-12T09:08:53.768Z'),
(174, 11, 'Graphite', '42', 0, '2026-09-12T09:08:53.768Z'),
(175, 11, 'Graphite', '43', 3, '2026-09-12T09:08:53.768Z'),
(176, 11, 'Graphite', '44', 3, '2026-09-12T09:08:53.768Z'),
(177, 11, 'Graphite', '45', 3, '2026-09-12T09:08:53.768Z'),
(178, 11, 'Black', '40', 3, '2026-09-12T09:08:53.768Z'),
(179, 11, 'Black', '41', 0, '2026-09-12T09:08:53.768Z'),
(180, 11, 'Black', '42', 3, '2026-09-12T09:08:53.768Z'),
(181, 11, 'Black', '43', 3, '2026-09-12T09:08:53.768Z'),
(182, 11, 'Black', '44', 3, '2026-09-12T09:08:53.768Z'),
(183, 11, 'Black', '45', 3, '2026-09-12T09:08:53.768Z'),
(184, 12, 'Cobalt', '40', 2, '2026-09-12T09:08:53.786Z'),
(185, 12, 'Cobalt', '41', 2, '2026-09-12T09:08:53.786Z'),
(186, 12, 'Cobalt', '42', 2, '2026-09-12T09:08:53.786Z'),
(187, 12, 'Cobalt', '43', 0, '2026-09-12T09:08:53.786Z'),
(188, 12, 'Cobalt', '44', 1, '2026-09-12T09:08:53.786Z'),
(189, 12, 'Cobalt', '45', 1, '2026-09-12T09:08:53.786Z'),
(190, 12, 'Signal Red', '40', 1, '2026-09-12T09:08:53.786Z'),
(191, 12, 'Signal Red', '41', 1, '2026-09-12T09:08:53.786Z'),
(192, 12, 'Signal Red', '42', 0, '2026-09-12T09:08:53.786Z'),
(193, 12, 'Signal Red', '43', 1, '2026-09-12T09:08:53.786Z'),
(194, 12, 'Signal Red', '44', 1, '2026-09-12T09:08:53.786Z'),
(195, 12, 'Signal Red', '45', 1, '2026-09-12T09:08:53.786Z'),
(196, 12, 'Optic White', '40', 1, '2026-09-12T09:08:53.786Z'),
(197, 12, 'Optic White', '41', 0, '2026-09-12T09:08:53.786Z'),
(198, 12, 'Optic White', '42', 1, '2026-09-12T09:08:53.786Z'),
(199, 12, 'Optic White', '43', 1, '2026-09-12T09:08:53.786Z'),
(200, 12, 'Optic White', '44', 1, '2026-09-12T09:08:53.786Z'),
(201, 12, 'Optic White', '45', 1, '2026-09-12T09:08:53.786Z'),
(202, 13, 'Black', '36', 2, '2026-09-12T09:08:53.801Z'),
(203, 13, 'Black', '37', 2, '2026-09-12T09:08:53.801Z'),
(204, 13, 'Black', '38', 2, '2026-09-12T09:08:53.801Z'),
(205, 13, 'Black', '39', 0, '2026-09-12T09:08:53.801Z'),
(206, 13, 'Black', '40', 2, '2026-09-12T09:08:53.801Z'),
(207, 13, 'Black', '41', 2, '2026-09-12T09:08:53.801Z'),
(208, 13, 'Charcoal', '36', 2, '2026-09-12T09:08:53.801Z'),
(209, 13, 'Charcoal', '37', 2, '2026-09-12T09:08:53.801Z'),
(210, 13, 'Charcoal', '38', 0, '2026-09-12T09:08:53.801Z'),
(211, 13, 'Charcoal', '39', 1, '2026-09-12T09:08:53.801Z'),
(212, 13, 'Charcoal', '40', 1, '2026-09-12T09:08:53.801Z'),
(213, 13, 'Charcoal', '41', 1, '2026-09-12T09:08:53.801Z'),
(214, 13, 'Graphite', '36', 1, '2026-09-12T09:08:53.801Z'),
(215, 13, 'Graphite', '37', 0, '2026-09-12T09:08:53.801Z'),
(216, 13, 'Graphite', '38', 1, '2026-09-12T09:08:53.801Z'),
(217, 13, 'Graphite', '39', 1, '2026-09-12T09:08:53.801Z'),
(218, 13, 'Graphite', '40', 1, '2026-09-12T09:08:53.801Z'),
(219, 13, 'Graphite', '41', 1, '2026-09-12T09:08:53.801Z'),
(220, 14, 'Black', '36', 2, '2026-09-12T09:08:53.818Z'),
(221, 14, 'Black', '37', 2, '2026-09-12T09:08:53.818Z'),
(222, 14, 'Black', '38', 2, '2026-09-12T09:08:53.818Z'),
(223, 14, 'Black', '39', 0, '2026-09-12T09:08:53.818Z'),
(224, 14, 'Black', '40', 1, '2026-09-12T09:08:53.818Z'),
(225, 14, 'Black', '41', 1, '2026-09-12T09:08:53.818Z'),
(226, 14, 'Charcoal', '36', 1, '2026-09-12T09:08:53.818Z'),
(227, 14, 'Charcoal', '37', 1, '2026-09-12T09:08:53.818Z'),
(228, 14, 'Charcoal', '38', 0, '2026-09-12T09:08:53.818Z'),
(229, 14, 'Charcoal', '39', 1, '2026-09-12T09:08:53.818Z'),
(230, 14, 'Charcoal', '40', 1, '2026-09-12T09:08:53.818Z'),
(231, 14, 'Charcoal', '41', 1, '2026-09-12T09:08:53.818Z'),
(232, 15, 'Optic White', '40', 2, '2026-09-12T09:08:53.834Z'),
(233, 15, 'Optic White', '41', 2, '2026-09-12T09:08:53.834Z'),
(234, 15, 'Optic White', '42', 2, '2026-09-12T09:08:53.834Z'),
(235, 15, 'Optic White', '43', 0, '2026-09-12T09:08:53.834Z'),
(236, 15, 'Optic White', '44', 2, '2026-09-12T09:08:53.834Z'),
(237, 15, 'Optic White', '45', 2, '2026-09-12T09:08:53.834Z'),
(238, 15, 'Black', '40', 2, '2026-09-12T09:08:53.834Z'),
(239, 15, 'Black', '41', 2, '2026-09-12T09:08:53.834Z'),
(240, 15, 'Black', '42', 0, '2026-09-12T09:08:53.834Z'),
(241, 15, 'Black', '43', 2, '2026-09-12T09:08:53.834Z'),
(242, 15, 'Black', '44', 2, '2026-09-12T09:08:53.834Z'),
(243, 15, 'Black', '45', 2, '2026-09-12T09:08:53.834Z'),
(244, 15, 'Graphite', '40', 2, '2026-09-12T09:08:53.834Z'),
(245, 15, 'Graphite', '41', 0, '2026-09-12T09:08:53.834Z'),
(246, 15, 'Graphite', '42', 2, '2026-09-12T09:08:53.834Z'),
(247, 15, 'Graphite', '43', 2, '2026-09-12T09:08:53.834Z'),
(248, 15, 'Graphite', '44', 1, '2026-09-12T09:08:53.834Z'),
(249, 15, 'Graphite', '45', 1, '2026-09-12T09:08:53.834Z'),
(250, 16, 'Black', 'XS', 2, '2026-09-12T09:08:53.850Z'),
(251, 16, 'Black', 'S', 2, '2026-09-12T09:08:53.850Z'),
(252, 16, 'Black', 'M', 2, '2026-09-12T09:08:53.850Z'),
(253, 16, 'Black', 'L', 0, '2026-09-12T09:08:53.850Z'),
(254, 16, 'Black', 'XL', 2, '2026-09-12T09:08:53.850Z'),
(255, 16, 'Ivory', 'XS', 2, '2026-09-12T09:08:53.850Z'),
(256, 16, 'Ivory', 'S', 2, '2026-09-12T09:08:53.850Z'),
(257, 16, 'Ivory', 'M', 2, '2026-09-12T09:08:53.850Z'),
(258, 16, 'Ivory', 'L', 0, '2026-09-12T09:08:53.850Z'),
(259, 16, 'Ivory', 'XL', 2, '2026-09-12T09:08:53.850Z'),
(260, 16, 'Bordeaux', 'XS', 1, '2026-09-12T09:08:53.850Z'),
(261, 16, 'Bordeaux', 'S', 1, '2026-09-12T09:08:53.850Z'),
(262, 16, 'Bordeaux', 'M', 1, '2026-09-12T09:08:53.850Z'),
(263, 16, 'Bordeaux', 'L', 0, '2026-09-12T09:08:53.850Z'),
(264, 16, 'Bordeaux', 'XL', 1, '2026-09-12T09:08:53.850Z'),
(265, 17, 'Optic White', 'XS', 3, '2026-09-12T09:08:53.866Z'),
(266, 17, 'Optic White', 'S', 3, '2026-09-12T09:08:53.866Z'),
(267, 17, 'Optic White', 'M', 3, '2026-09-12T09:08:53.866Z'),
(268, 17, 'Optic White', 'L', 0, '2026-09-12T09:08:53.866Z'),
(269, 17, 'Optic White', 'XL', 3, '2026-09-12T09:08:53.866Z'),
(270, 17, 'Ivory', 'XS', 3, '2026-09-12T09:08:53.866Z'),
(271, 17, 'Ivory', 'S', 3, '2026-09-12T09:08:53.866Z'),
(272, 17, 'Ivory', 'M', 3, '2026-09-12T09:08:53.866Z'),
(273, 17, 'Ivory', 'L', 0, '2026-09-12T09:08:53.866Z'),
(274, 17, 'Ivory', 'XL', 2, '2026-09-12T09:08:53.866Z'),
(275, 17, 'Sky', 'XS', 2, '2026-09-12T09:08:53.866Z'),
(276, 17, 'Sky', 'S', 2, '2026-09-12T09:08:53.866Z'),
(277, 17, 'Sky', 'M', 2, '2026-09-12T09:08:53.866Z'),
(278, 17, 'Sky', 'L', 0, '2026-09-12T09:08:53.866Z'),
(279, 17, 'Sky', 'XL', 2, '2026-09-12T09:08:53.866Z'),
(280, 18, 'Ivory', 'XS', 2, '2026-09-12T09:08:53.882Z'),
(281, 18, 'Ivory', 'S', 2, '2026-09-12T09:08:53.882Z'),
(282, 18, 'Ivory', 'M', 2, '2026-09-12T09:08:53.882Z'),
(283, 18, 'Ivory', 'L', 0, '2026-09-12T09:08:53.882Z'),
(284, 18, 'Ivory', 'XL', 1, '2026-09-12T09:08:53.882Z'),
(285, 18, 'Midnight', 'XS', 1, '2026-09-12T09:08:53.882Z'),
(286, 18, 'Midnight', 'S', 1, '2026-09-12T09:08:53.882Z'),
(287, 18, 'Midnight', 'M', 1, '2026-09-12T09:08:53.882Z'),
(288, 18, 'Midnight', 'L', 0, '2026-09-12T09:08:53.882Z'),
(289, 18, 'Midnight', 'XL', 1, '2026-09-12T09:08:53.882Z'),
(290, 19, 'Rose', 'XS', 2, '2026-09-12T09:08:53.897Z'),
(291, 19, 'Rose', 'S', 2, '2026-09-12T09:08:53.897Z'),
(292, 19, 'Rose', 'M', 2, '2026-09-12T09:08:53.897Z'),
(293, 19, 'Rose', 'L', 0, '2026-09-12T09:08:53.897Z'),
(294, 19, 'Rose', 'XL', 2, '2026-09-12T09:08:53.897Z'),
(295, 19, 'Black', 'XS', 2, '2026-09-12T09:08:53.897Z'),
(296, 19, 'Black', 'S', 2, '2026-09-12T09:08:53.897Z'),
(297, 19, 'Black', 'M', 1, '2026-09-12T09:08:53.897Z'),
(298, 19, 'Black', 'L', 0, '2026-09-12T09:08:53.897Z'),
(299, 19, 'Black', 'XL', 1, '2026-09-12T09:08:53.897Z'),
(300, 20, 'Optic White', 'XS', 2, '2026-09-12T09:08:53.912Z'),
(301, 20, 'Optic White', 'S', 2, '2026-09-12T09:08:53.912Z'),
(302, 20, 'Optic White', 'M', 2, '2026-09-12T09:08:53.912Z'),
(303, 20, 'Optic White', 'L', 0, '2026-09-12T09:08:53.912Z'),
(304, 20, 'Optic White', 'XL', 2, '2026-09-12T09:08:53.912Z'),
(305, 20, 'Black', 'XS', 2, '2026-09-12T09:08:53.912Z'),
(306, 20, 'Black', 'S', 2, '2026-09-12T09:08:53.912Z'),
(307, 20, 'Black', 'M', 2, '2026-09-12T09:08:53.912Z'),
(308, 20, 'Black', 'L', 0, '2026-09-12T09:08:53.912Z'),
(309, 20, 'Black', 'XL', 2, '2026-09-12T09:08:53.912Z'),
(310, 20, 'Charcoal', 'XS', 1, '2026-09-12T09:08:53.912Z'),
(311, 20, 'Charcoal', 'S', 1, '2026-09-12T09:08:53.912Z'),
(312, 20, 'Charcoal', 'M', 1, '2026-09-12T09:08:53.912Z'),
(313, 20, 'Charcoal', 'L', 0, '2026-09-12T09:08:53.912Z'),
(314, 20, 'Charcoal', 'XL', 1, '2026-09-12T09:08:53.912Z'),
(315, 20, 'Bottle', 'XS', 1, '2026-09-12T09:08:53.912Z'),
(316, 20, 'Bottle', 'S', 1, '2026-09-12T09:08:53.912Z'),
(317, 20, 'Bottle', 'M', 1, '2026-09-12T09:08:53.912Z'),
(318, 20, 'Bottle', 'L', 0, '2026-09-12T09:08:53.912Z'),
(319, 20, 'Bottle', 'XL', 1, '2026-09-12T09:08:53.912Z'),
(320, 21, 'Black', 'XS', 3, '2026-09-12T09:08:53.926Z'),
(321, 21, 'Black', 'S', 3, '2026-09-12T09:08:53.926Z'),
(322, 21, 'Black', 'M', 3, '2026-09-12T09:08:53.926Z'),
(323, 21, 'Black', 'L', 0, '2026-09-12T09:08:53.926Z'),
(324, 21, 'Black', 'XL', 3, '2026-09-12T09:08:53.926Z'),
(325, 21, 'Optic White', 'XS', 3, '2026-09-12T09:08:53.926Z'),
(326, 21, 'Optic White', 'S', 3, '2026-09-12T09:08:53.926Z'),
(327, 21, 'Optic White', 'M', 3, '2026-09-12T09:08:53.926Z'),
(328, 21, 'Optic White', 'L', 0, '2026-09-12T09:08:53.926Z'),
(329, 21, 'Optic White', 'XL', 3, '2026-09-12T09:08:53.926Z'),
(330, 21, 'Navy', 'XS', 3, '2026-09-12T09:08:53.926Z'),
(331, 21, 'Navy', 'S', 3, '2026-09-12T09:08:53.926Z'),
(332, 21, 'Navy', 'M', 3, '2026-09-12T09:08:53.926Z'),
(333, 21, 'Navy', 'L', 0, '2026-09-12T09:08:53.926Z'),
(334, 21, 'Navy', 'XL', 2, '2026-09-12T09:08:53.926Z'),
(335, 22, 'Optic White', 'S', 6, '2026-09-12T09:08:53.944Z'),
(336, 22, 'Optic White', 'M', 6, '2026-09-12T09:08:53.944Z'),
(337, 22, 'Optic White', 'L', 6, '2026-09-12T09:08:53.944Z'),
(338, 22, 'Optic White', 'XL', 0, '2026-09-12T09:08:53.944Z'),
(339, 22, 'Optic White', 'XXL', 6, '2026-09-12T09:08:53.944Z'),
(340, 22, 'Ivory', 'S', 6, '2026-09-12T09:08:53.944Z'),
(341, 22, 'Ivory', 'M', 6, '2026-09-12T09:08:53.944Z'),
(342, 22, 'Ivory', 'L', 6, '2026-09-12T09:08:53.944Z'),
(343, 22, 'Ivory', 'XL', 0, '2026-09-12T09:08:53.944Z'),
(344, 22, 'Ivory', 'XXL', 6, '2026-09-12T09:08:53.944Z'),
(345, 22, 'Black', 'S', 6, '2026-09-12T09:08:53.944Z'),
(346, 22, 'Black', 'M', 6, '2026-09-12T09:08:53.944Z'),
(347, 22, 'Black', 'L', 6, '2026-09-12T09:08:53.944Z'),
(348, 22, 'Black', 'XL', 0, '2026-09-12T09:08:53.944Z'),
(349, 22, 'Black', 'XXL', 6, '2026-09-12T09:08:53.944Z'),
(350, 22, 'Sage', 'S', 6, '2026-09-12T09:08:53.944Z'),
(351, 22, 'Sage', 'M', 6, '2026-09-12T09:08:53.944Z'),
(352, 22, 'Sage', 'L', 6, '2026-09-12T09:08:53.944Z'),
(353, 22, 'Sage', 'XL', 0, '2026-09-12T09:08:53.944Z'),
(354, 22, 'Sage', 'XXL', 6, '2026-09-12T09:08:53.944Z'),
(355, 23, 'Black', 'XS', 2, '2026-09-12T09:08:53.958Z'),
(356, 23, 'Black', 'S', 2, '2026-09-12T09:08:53.958Z'),
(357, 23, 'Black', 'M', 1, '2026-09-12T09:08:53.958Z'),
(358, 23, 'Black', 'L', 0, '2026-09-12T09:08:53.958Z'),
(359, 23, 'Black', 'XL', 1, '2026-09-12T09:08:53.958Z'),
(360, 23, 'Charcoal', 'XS', 1, '2026-09-12T09:08:53.958Z'),
(361, 23, 'Charcoal', 'S', 1, '2026-09-12T09:08:53.958Z'),
(362, 23, 'Charcoal', 'M', 1, '2026-09-12T09:08:53.958Z'),
(363, 23, 'Charcoal', 'L', 0, '2026-09-12T09:08:53.958Z'),
(364, 23, 'Charcoal', 'XL', 1, '2026-09-12T09:08:53.958Z'),
(365, 24, 'Rinse Indigo', 'S', 4, '2026-09-12T09:08:53.972Z'),
(366, 24, 'Rinse Indigo', 'M', 4, '2026-09-12T09:08:53.972Z'),
(367, 24, 'Rinse Indigo', 'L', 4, '2026-09-12T09:08:53.972Z'),
(368, 24, 'Rinse Indigo', 'XL', 0, '2026-09-12T09:08:53.972Z'),
(369, 24, 'Rinse Indigo', 'XXL', 4, '2026-09-12T09:08:53.972Z'),
(370, 24, 'Washed Black', 'S', 4, '2026-09-12T09:08:53.972Z'),
(371, 24, 'Washed Black', 'M', 3, '2026-09-12T09:08:53.972Z'),
(372, 24, 'Washed Black', 'L', 3, '2026-09-12T09:08:53.972Z'),
(373, 24, 'Washed Black', 'XL', 0, '2026-09-12T09:08:53.972Z'),
(374, 24, 'Washed Black', 'XXL', 3, '2026-09-12T09:08:53.972Z')
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------- resync sequences

SELECT setval(pg_get_serial_sequence('collections', 'id'), COALESCE((SELECT MAX(id) FROM collections), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE((SELECT MAX(id) FROM customers), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('reviews', 'id'), COALESCE((SELECT MAX(id) FROM reviews), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('subscribers', 'id'), COALESCE((SELECT MAX(id) FROM subscribers), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('discount_codes', 'id'), COALESCE((SELECT MAX(id) FROM discount_codes), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('orders', 'id'), COALESCE((SELECT MAX(id) FROM orders), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_items), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('order_events', 'id'), COALESCE((SELECT MAX(id) FROM order_events), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('favourites', 'id'), COALESCE((SELECT MAX(id) FROM favourites), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('product_variants', 'id'), COALESCE((SELECT MAX(id) FROM product_variants), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('contact_messages', 'id'), COALESCE((SELECT MAX(id) FROM contact_messages), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('gift_cards', 'id'), COALESCE((SELECT MAX(id) FROM gift_cards), 0) + 1, FALSE);
SELECT setval(pg_get_serial_sequence('admin_users', 'id'), COALESCE((SELECT MAX(id) FROM admin_users), 0) + 1, FALSE);


-- ---------------------------------------------------- Supabase API security
-- This application uses its server-side PostgreSQL connection and its own
-- signed-cookie authentication. No table is intended to be read through the
-- public Supabase Data API. Enabling RLS with no public policies blocks anon
-- and authenticated API roles; the server database role continues to work.
ALTER TABLE collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users      ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------- done
-- Demo accounts
--   store owner : your ADMIN_EMAIL / ADMIN_PASSWORD from the environment
--   client      : client@nova.com / nova1234
-- Discount codes: NOVAWELCOME (10% store), FOOTWEAR20 (20% Footwear), ESSENTIAL25 ($25 off Essentials, min $300)

