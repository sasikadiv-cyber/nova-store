-- ===========================================================================
--  NOVA — incremental migration for an EXISTING database
--
--  Run this once in the Supabase SQL editor if your database was set up
--  before the site pages, contact messages, currency rules, gift cards and
--  team access features shipped. Safe to run more than once.
--
--  Adds:  site_pages, contact_messages, currency_rules, gift_cards,
--         admin_users, products.complete_look, customers.reset_*
--  Drops: payment_methods (saved cards are no longer stored — see the
--         privacy policy; the checkout still takes cards at payment time)
-- ===========================================================================

-- ---------------------------------------------------------------- new tables

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

-- -------------------------------------------------------------- new columns

ALTER TABLE products ADD COLUMN IF NOT EXISTS complete_look jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reset_code_hash text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reset_expires timestamptz;

-- --------------------------------------------------------- removed feature

DROP TABLE IF EXISTS payment_messages CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;

-- ------------------------------------------------------------------- safety

-- No table is read through the public Supabase Data API; RLS blocks anon and
-- authenticated roles while the server connection keeps working.
ALTER TABLE site_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users      ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------- seeds
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('help', 'Help Centre', 'Client care', 'Everything you need before and after an order — answered by the same team that packs your parcel in Rotterdam.', '[{"body": ["Orders are confirmed by email within minutes and enter the atelier queue the same working day. You can follow every step from your account, from confirmation to delivery.", "If a size or colourway is showing as unavailable, join the waitlist from the product page — restocks are announced to that list first."], "heading": "Ordering"}, {"body": ["We accept Visa, Mastercard, American Express, PayPal, Apple Pay and Klarna. Card details are entered at checkout and are never stored on your account.", "Prices are shown in your chosen currency for guidance; the charge is settled in USD at your bank''s rate."], "heading": "Payment"}, {"body": ["Standard express shipping is complimentary on every order and arrives within three to five working days to 94 countries, duties and taxes included.", "Priority shipping is available at checkout and moves your order to the front of the packing queue."], "heading": "Delivery"}, {"body": ["Write to the studio from the contact page and a client adviser replies within one working day, in English, French, German or Sinhala."], "heading": "Still need us?"}]', TRUE, 1, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('contact', 'Contact Us', 'We are listening', 'A client adviser reads every message personally. Write to us about sizing, deliveries, repairs or a piece you are searching for.', '[{"body": ["Monday to Friday, 09:00 – 18:00 CET. Replies land within one working day."], "heading": "Client services"}, {"body": ["Our Rotterdam atelier welcomes clients by appointment for fittings and repairs. Write to us and we will arrange a time."], "heading": "Studio visits"}]', TRUE, 2, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('shipping', 'Global Shipping', 'Worldwide, duties included', 'Express delivery to 94 countries from our Rotterdam and Singapore hubs, with duties and taxes settled at checkout.', '[{"body": ["Standard express is complimentary on every order and arrives in three to five working days. Priority shipping is available at checkout for next-working-day dispatch to most cities."], "heading": "Rates and speeds"}, {"body": ["The price you pay at checkout is final. We prepay import duties and taxes for every destination we serve, so nothing is collected on your doorstep."], "heading": "Duties and taxes"}, {"body": ["Every parcel ships with a DHL or UPS tracking number, visible in your account from the moment it leaves the atelier."], "heading": "Tracking"}]', TRUE, 3, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('returns', 'Returns & Exchanges', 'Thirty days, prepaid', 'Try everything on at home. If a piece is not right, return it within thirty days with a prepaid label.', '[{"body": ["You have thirty days from delivery to start a return or exchange. Pieces should be unworn with their tags and original packaging."], "heading": "The window"}, {"body": ["Open your account, choose the order and select the pieces you are sending back. A prepaid label arrives by email instantly. Refunds are issued within three working days of arrival at the studio."], "heading": "How it works"}, {"body": ["Size and colour exchanges are free. We hold your new size for seven days while your parcel travels back to us."], "heading": "Exchanges"}]', TRUE, 4, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('size-guide', 'Size Guide', 'Measure once', 'Our pieces are cut in European sizing. Measure a garment you already love and match it to the tables below.', '[{"body": ["Chest is measured flat across the fullest point, doubled. Length is from the highest shoulder point to the hem. If you sit between two sizes, take the larger for tailoring and the smaller for knitwear."], "heading": "Knitwear and tailoring"}, {"body": ["Our Porto-made shoes run true to Brannock size. If you are between sizes, we recommend the half size down for loafers and the half size up for boots worn with socks."], "heading": "Footwear"}, {"body": ["Write to us from the contact page with your usual sizes in other houses and a client adviser will map them for you."], "heading": "Still unsure?"}]', TRUE, 5, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('product-care', 'Product Care', 'Repaired, not replaced', 'Every piece is made to be kept. Free stitching and resoling on all footwear for the life of the shoe.', '[{"body": ["Hand wash cool with a pH-neutral soap, or dry clean. Dry flat away from direct heat. Store folded with cedar, never on a hanger."], "heading": "Cashmere and merino"}, {"body": ["Machine wash at thirty degrees on a gentle cycle and hang to dry. Press on the reverse while slightly damp for a crisp finish."], "heading": "Cotton and linen"}, {"body": ["Brush off dust after wear, condition every few months with a neutral cream, and rest your shoes on cedar trees between wears."], "heading": "Leather footwear"}]', TRUE, 6, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('privacy', 'Privacy Policy', 'Your data', 'We collect the minimum we need to send you beautiful things, and we never sell it.', '[{"body": ["Your name, delivery address, email and order history. Payment card details are entered at checkout and processed by our payment partners — they are never stored on your account or on our servers."], "heading": "What we collect"}, {"body": ["To make and deliver your orders, to answer your messages, and — only if you ask — to send you our newsletter. Analytics are aggregated and anonymous."], "heading": "How we use it"}, {"body": ["You may request a copy of your data, correct it, or have your account deleted at any time. Write to us from the contact page and we action every request within thirty days."], "heading": "Your rights"}, {"body": ["A strictly necessary cookie keeps your session and bag. Analytics cookies only run with your consent, and your theme and currency preferences are kept on your own device."], "heading": "Cookies"}]', TRUE, 7, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('terms', 'Terms & Conditions', 'The agreement', 'The terms of sale for every order placed with Nova Global Commerce.', '[{"body": ["An order is an offer to buy. The contract forms when we confirm dispatch. Prices are shown in your chosen currency and settled in USD; a price is only binding once your order is confirmed."], "heading": "Orders and pricing"}, {"body": ["Risk passes to you on delivery. If a parcel arrives damaged, photograph the packaging and write to us within seven days and we will replace the piece."], "heading": "Delivery and title"}, {"body": ["You have thirty days from delivery to return unworn pieces for a full refund. The statutory right of withdrawal is unaffected by these terms."], "heading": "Returns"}, {"body": ["Our liability is limited to the value of the affected order. Nothing in these terms limits liability for death, personal injury or fraud."], "heading": "Liability"}]', TRUE, 8, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('accessibility', 'Accessibility', 'For everyone', 'A store should be as easy to use as it is beautiful. Here is where we stand and where we are going.', '[{"body": ["The storefront is built to WCAG 2.1 AA: keyboard navigation across every page, visible focus states, alt text on product imagery, and colour contrast checked in both light and dark themes.", "The interface respects your motion preferences and never relies on colour alone to convey meaning."], "heading": "What we do today"}, {"body": ["Full screen-reader labelling for the checkout flow and transcripts for our campaign films are in progress."], "heading": "What we are working on"}, {"body": ["If anything on this site is hard to use, write to us from the contact page. Every message is read by a person and shapes what we fix next."], "heading": "Tell us what you need"}]', TRUE, 9, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('materials', 'Our Materials', 'The source', 'Fibres and leathers chosen slowly, from mills we visit three times a year.', '[{"body": ["Two-ply, grade-A cashmere from Inner Mongolia, spun in Biella. Long fibres mean less pilling and a hand that softens with age."], "heading": "Cashmere"}, {"body": ["Selvedge denim woven on shuttle looms in Okayama, sanforised so the fit you buy is the fit you keep."], "heading": "Denim"}, {"body": ["Vegetable-tanned calf and suede from certified tanneries in Tuscany, chosen for the way they patina rather than wear out."], "heading": "Leather"}]', TRUE, 10, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('responsibility', 'Responsibility', 'Made to be kept', 'Small runs, honest materials and repairs instead of landfill.', '[{"body": ["Between 150 and 600 units per colourway. Nothing is made to sit in a warehouse, and nothing is destroyed at the end of a season."], "heading": "Small-run manufacturing"}, {"body": ["Free stitching and resoling on all footwear for the life of the shoe. Bring a piece back and we will bring it back."], "heading": "Repair for life"}, {"body": ["Recycled and recyclable boxes, paper tape and no plastic windows. Our garment bags are compostable cornstarch."], "heading": "Packaging"}]', TRUE, 11, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('ateliers', 'Ateliers & Mills', 'The makers', 'Four workshops and three mills, visited three times a year, on a first-name basis.', '[{"body": ["Where our cashmere and merino are spun. The mill has been family-run since 1663 and still washes its yarn in Alpine water."], "heading": "Biella, Italy"}, {"body": ["Shuttle looms running at a third of modern speed, weaving the selvedge denim for our five-pocket jean."], "heading": "Okayama, Japan"}, {"body": ["The footwear atelier. Each pair passes through sixty pairs of hands before it is boxed."], "heading": "Porto, Portugal"}]', TRUE, 12, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO site_pages (slug, title, eyebrow, intro, blocks, published, sort_order, updated_at) VALUES ('careers', 'Careers', 'Join the house', 'A small team, working slowly and well. We hire for curiosity and keep people for decades.', '[{"body": ["Studio-first, hybrid where the role allows. Everyone in the company, including the founders, spends one week a season on the client services desk."], "heading": "How we work"}, {"body": ["We post new roles here as they open. If nothing fits, write to us from the contact page with a note about what you make and how you work."], "heading": "Open roles"}]', TRUE, 13, now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO currency_rules (code, fx_rate, markup_percent, rounding, active, updated_at) VALUES
  ('USD', 1, 0, 'none', TRUE, now()),
  ('EUR', 0.92, 0, 'none', TRUE, now()),
  ('GBP', 0.79, 0, 'none', TRUE, now()),
  ('JPY', 152, 0, 'none', TRUE, now()),
  ('AED', 3.67, 0, 'none', TRUE, now()),
  ('CAD', 1.36, 0, 'none', TRUE, now()),
  ('AUD', 1.52, 0, 'none', TRUE, now())
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------------- done
-- Seeds are skipped if the rows already exist, so your own edits are never
-- overwritten. Demo catalogue data is deliberately NOT inserted.
