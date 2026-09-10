# NOVA Storefront — Setup & Supabase Deployment Guide

NOVA is a full-stack global fashion storefront built with **Next.js App Router**, **PostgreSQL**, **Drizzle ORM**, and Tailwind CSS.

මෙම README එකේ තියෙන්නේ project එක Supabase PostgreSQL database එකකට connect කරලා production deploy කරන complete procedure එකයි.

---

## Contents

1. [What is included](#what-is-included)
2. [Before you begin](#before-you-begin)
3. [Create the Supabase project](#1-create-the-supabase-project)
4. [Create all tables and demo data](#2-create-all-tables-and-demo-data)
5. [Verify the Supabase import](#3-verify-the-supabase-import)
6. [Get the correct database connection string](#4-get-the-correct-database-connection-string)
7. [Configure environment variables](#5-configure-environment-variables)
8. [Run locally against Supabase](#6-run-locally-against-supabase)
9. [Deploy the application](#7-deploy-the-application)
10. [Verify the deployed store](#8-verify-the-deployed-store)
11. [Admin and demo customer accounts](#accounts)
12. [Database and security notes](#database-and-security-notes)
13. [Troubleshooting](#troubleshooting)
14. [Final checklist](#final-checklist)

---

## What is included

### Storefront

- Responsive luxury home page and hero video
- Collections and product catalogue
- Category, gender, colour, size, price, and sale filters
- Product galleries, cursor-position zoom, and story imagery
- Quick-view modal
- Persistent shopping bag
- Colour × size availability
- Server-validated stock and oversell protection
- Promotional discount codes
- Multi-step checkout
- Light and dark themes
- Customer wishlist

### Customer account

- Sign in and account creation
- Active orders and order history
- Live order-status timeline
- Tracking number display
- Delivered-order reviews
- Saved payment method metadata
- Wishlist management
- Profile, delivery address, and password management

### Store management

The management console is available only through the private URL `/admin`.

- Dashboard and store statistics
- Create and edit products
- Product and story image management
- Colour wheel and size variants
- Colour × size stock matrix
- Batch stock updates
- Collection management
- Discount code management
- Order status and tracking updates
- Review moderation

---

## Before you begin

You need:

- A [Supabase](https://supabase.com) account
- A GitHub account if deploying through Vercel
- Node.js 20 or later for local development
- The Supabase database password you choose during project creation

> **Important:** Use a new/empty Supabase project for the included setup SQL. Do not run the setup script over an unrelated database containing important tables or data.

---

## 1. Create the Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select **New project**.
3. Choose your organisation.
4. Enter a project name, for example `nova-store`.
5. Create a strong database password and save it in a password manager.
6. Select the closest region to the majority of customers.
   - For Sri Lanka and South Asia, **Singapore** is normally the best choice.
7. Select the free plan and create the project.
8. Wait until the project status becomes healthy/active.

Do not expose the project database password, service-role key, or connection string in browser code or a public repository.

---

## 2. Create all tables and demo data

The project root contains:

```text
supabase-setup.sql
```

This file contains:

- All 12 application tables
- Foreign keys and indexes
- Collections and product catalogue data
- Product images and story-image metadata
- Reviews
- Colour × size stock variants
- Discount codes
- Customer account demo data
- Demo orders, tracking events, cards, and wishlist data
- PostgreSQL sequence synchronisation
- Row Level Security hardening for Supabase's public Data API

### Run it in Supabase

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Select **New query**.
4. Open `supabase-setup.sql` in this project.
5. Copy the entire file.
6. Paste it into the Supabase SQL Editor.
7. Select **Run**.
8. Wait for the query to finish successfully.

The script is safe to run again against the same NOVA database because tables and indexes use `IF NOT EXISTS`, while seeded rows use conflict protection.

> Re-running does not overwrite existing rows with the same IDs. Use the admin console for normal product, stock, collection, and discount changes after the initial import.

### Expected imported data

The current setup file contains approximately:

| Data | Expected count |
|---|---:|
| Collections | 4 |
| Products | 27 |
| Reviews | 57 |
| Product stock variants | 423 |
| Discount codes | 3 |
| Demo customers | 1 |
| Demo orders | 5 |
| Payment methods | 2 |

The script also includes the products previously created through the management console.

---

## 3. Verify the Supabase import

After running the setup SQL:

1. Open **Table Editor**.
2. Confirm that the following tables exist:

```text
collections
products
product_variants
customers
payment_methods
reviews
favourites
subscribers
discount_codes
orders
order_items
order_events
```

3. Open `products` and confirm there are product rows.
4. Open `product_variants` and confirm colour/size/stock rows exist.
5. Open `collections` and confirm the four demo collections exist.

You can also run this verification query in SQL Editor:

```sql
select 'collections' as table_name, count(*) as rows from collections
union all select 'products', count(*) from products
union all select 'product_variants', count(*) from product_variants
union all select 'reviews', count(*) from reviews
union all select 'discount_codes', count(*) from discount_codes
union all select 'customers', count(*) from customers
union all select 'orders', count(*) from orders
union all select 'order_events', count(*) from order_events;
```

### Verify stock totals

```sql
select
  count(*) as correctly_synced_products,
  (select count(*) from products) as total_products
from products p
where p.stock = (
  select coalesce(sum(v.stock), 0)
  from product_variants v
  where v.product_id = p.id
);
```

Both values should be equal.

---

## 4. Get the correct database connection string

Official reference: [Supabase — Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)

In the Supabase dashboard, select **Connect** and copy one of the following connection strings.

### Recommended for this app: Session pooler

Use **Session pooler**, port `5432`, unless the hosting platform has reliable IPv6 support.

Typical format:

```text
postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Why Session pooler is recommended:

- Works from IPv4 hosting and local networks
- Compatible with normal PostgreSQL sessions
- Compatible with ORM and prepared-statement behaviour
- Avoids the IPv6 limitation of Supabase direct connections on the free plan

### Direct connection

Use this only if your environment supports IPv6 or your Supabase project has the IPv4 add-on:

```text
postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
```

### Transaction pooler

The transaction pooler uses port `6543` and is intended for serverless/edge workloads that create many short connections. Transaction mode does not support every session feature or prepared-statement workflow.

For the current Node PostgreSQL setup, use the **Session pooler** first. Only use Transaction mode if your final hosting architecture requires it and it has been tested with the full checkout/admin flow.

### URL-encode the password

If the database password contains reserved URL characters, encode them before placing the password in the URI.

Common examples:

| Character | Encoded value |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `?` | `%3F` |
| `/` | `%2F` |
| `:` | `%3A` |
| `%` | `%25` |

A password such as:

```text
Nova@Store#2026
```

must appear in the connection URL as:

```text
Nova%40Store%232026
```

Always keep `sslmode=require` on the connection string.

---

## 5. Configure environment variables

The running application reads the database connection from `DATABASE_URL`.

Update your local `.env` file:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require"

ADMIN_EMAIL="your-private-admin-email@example.com"
ADMIN_PASSWORD="use-a-long-unique-password"
ADMIN_SECRET="use-a-random-secret-with-at-least-32-characters"
CUSTOMER_SECRET="use-a-different-random-secret-with-at-least-32-characters"
```

### Generate secure secrets

You can generate each signing secret with:

```bash
openssl rand -base64 48
```

Use different values for `ADMIN_SECRET` and `CUSTOMER_SECRET`.

### What each variable does

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server-side Supabase PostgreSQL connection |
| `ADMIN_EMAIL` | Store management login email |
| `ADMIN_PASSWORD` | Store management login password |
| `ADMIN_SECRET` | Signs the secure admin session cookie |
| `CUSTOMER_SECRET` | Signs customer session cookies |

### Supabase API keys are not required

This application uses:

- Server-side PostgreSQL via Drizzle ORM
- Its own customer authentication
- Its own admin authentication

Therefore the current implementation does **not** require:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Do not add a service-role key to client-side code.

### Never commit secrets

Do not commit these files or values to GitHub:

```text
.env
.env.local
*.env.production
```

If a credential has ever been committed or shared publicly, rotate it from the Supabase dashboard immediately.

---

## 6. Run locally against Supabase

After updating `.env`:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Test the health endpoint:

```text
http://localhost:3000/api/health
```

Expected response:

```json
{"ok":true}
```

### Important after changing `DATABASE_URL`

Stop and restart the Next.js process. The PostgreSQL pool is created at server startup, so an already running process continues using its old connection.

If the browser still shows old data, use a hard refresh and restart the development server.

---

## 7. Deploy the application

### Recommended: Vercel

1. Push the project to a private GitHub repository.
2. Open [Vercel](https://vercel.com).
3. Select **Add New → Project**.
4. Import the repository.
5. In **Environment Variables**, add:

```text
DATABASE_URL
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_SECRET
CUSTOMER_SECRET
```

6. Add them for Production, Preview, and Development as required.
7. Deploy the project.
8. If you change an environment variable later, redeploy. Existing builds do not automatically pick up changed variables.

### Other Node.js hosting

The app also works on any provider that supports:

- Node.js 20+
- Next.js production builds
- Outbound SSL PostgreSQL connections
- Persistent environment variables

For IPv4-only providers, use the Supabase **Session pooler** URL.

---

## 8. Verify the deployed store

After deployment, test in this order:

### Public storefront

```text
/
/shop
/products/aurora-double-faced-wool-coat
/checkout
/api/health
```

### Store management

The admin link is intentionally not exposed in the storefront footer or navigation.

Open it by manually appending:

```text
/admin
```

Confirm:

1. Admin credentials work.
2. Dashboard shows the Supabase product count.
3. An existing product can be edited.
4. A new product appears in `/shop` immediately.
5. Stock management can update colour × size stock.
6. An out-of-stock variant becomes disabled on the storefront.
7. Order status updates appear in the customer tracking timeline.

### Customer account

```text
/account/login
/account
/account/orders
/account/favourites
/account/reviews
/account/payment
/account/profile
```

Confirm:

1. Sign up creates a `customers` row.
2. Sign in creates an HTTP-only customer session.
3. Wishlist hearts persist to `favourites`.
4. Checkout links an order to the signed-in customer.
5. Buying an item reduces its exact colour × size stock.
6. Admin order-status updates appear in the account timeline.
7. Delivered orders allow verified reviews.

---

## Accounts

### Store-management account

The store-management account is controlled only by deployment environment variables:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
```

No admin credentials are stored in the Supabase tables, and the management URL is not shown to normal customers.

### Demo customer account

The setup SQL includes a customer account for testing:

```text
Email:    client@nova.com
Password: nova1234
```

This account includes demo orders, tracking events, payment metadata, reviews, and wishlist data.

Change or remove the demo account before a real production launch if it is not needed.

---

## Database and security notes

### Row Level Security

The setup SQL enables RLS on all application tables and creates no public Data API policies.

This is intentional:

- Browser clients should not query these tables using the Supabase anonymous key.
- All application reads/writes go through trusted Next.js server routes/components using `DATABASE_URL`.
- Customer permissions are checked on the server using signed HTTP-only session cookies.
- Admin mutations require the signed admin session.

Do not disable RLS or add broad anonymous policies unless the architecture is deliberately changed to use the Supabase Data API.

### Password security

Customer passwords are stored as salted `scrypt` hashes. Plain customer passwords are never stored.

Admin credentials remain only in environment variables.

### Payment data

The database stores only:

- Card brand
- Last four digits
- Expiry month and year

It does not store full card numbers or CVC values.

The current checkout is a demonstration flow and does not charge a real payment method. Before accepting real payments, integrate a PCI-compliant provider such as Stripe or Adyen on the server.

### Stock integrity

Stock exists at two levels:

- `product_variants.stock`: exact colour × size inventory
- `products.stock`: sum of all variant rows

The order service checks and reduces the exact variant before writing the order. Out-of-stock purchases are rejected by the server even if someone bypasses the browser interface.

### Image hosting

Product images are currently stored as URLs. Supabase Storage is not required by the current implementation.

If image uploads are added later, use a dedicated Supabase Storage bucket and store only the resulting public/signed URL in PostgreSQL.

---

## Updating the generated SQL file

`scripts/generate-setup-sql.mjs` regenerates `supabase-setup.sql` from the current database.

Run:

```bash
node scripts/generate-setup-sql.mjs
```

This is useful for creating a new development/demo snapshot. Do not use generated full-database seed files as a replacement for production backups.

For production database backups, use Supabase backup features or `pg_dump` through an appropriate direct/session connection.

---

## Troubleshooting

### `ENETUNREACH`, timeout, or direct connection does not work

Cause: Supabase Direct connection is IPv6-only on the free plan.

Fix:

1. Open Supabase **Connect**.
2. Select **Session pooler**.
3. Use the pooler hostname and port `5432`.
4. Keep `sslmode=require`.

### `password authentication failed`

Check:

- The password is the database password, not the Supabase account password.
- Reserved password characters are URL-encoded.
- The username includes the project reference when using the shared pooler.
- The connection string was copied from the correct Supabase project.

You can reset the database password in Supabase Database settings.

### `/api/health` returns HTTP 500

Check:

1. `DATABASE_URL` exists in the running environment.
2. It ends with `sslmode=require`.
3. The Supabase project is active and not paused.
4. The project was redeployed after changing environment variables.
5. The connection string is Session pooler if the host is IPv4-only.

### Tables exist but the app shows no products

Most likely the app is connected to a different database/project.

- Compare the project reference in `DATABASE_URL` with the Supabase project.
- Restart/redeploy the application.
- Check `products` in Supabase Table Editor.
- Open `/api/health`.
- Hard-refresh the browser.

### Admin login fails

- Use the exact values set in `ADMIN_EMAIL` and `ADMIN_PASSWORD` on the hosting platform.
- Do not use the Supabase dashboard login.
- Redeploy after modifying environment variables.
- Confirm there are no accidental spaces around the values.

### SQL Editor shows a table-already-exists notice

The script uses `IF NOT EXISTS`, so it can be rerun against the same NOVA project.

If a different existing schema conflicts with it, create a fresh Supabase project instead of deleting unknown production data.

### Supabase project is paused

Free projects may pause after a period without activity. Restore the project from the Supabase dashboard and wait until it is healthy before testing `/api/health` again.

### Product writes work but updates are not visible

- Confirm the deployed app points to the same Supabase database.
- Restart/redeploy after changing `DATABASE_URL`.
- Hard-refresh the browser.
- Product and stock updates already use dynamic routes and invalidate the relevant Next.js route cache.

### Transaction pooler errors

If using port `6543` and ORM/database errors occur, switch to the **Session pooler** on port `5432`. Transaction mode does not support every session or prepared-statement workflow.

---

## Useful application routes

| Area | Route |
|---|---|
| Home | `/` |
| Shop | `/shop` |
| Checkout | `/checkout` |
| Customer sign in | `/account/login` |
| Customer dashboard | `/account` |
| Customer orders | `/account/orders` |
| Customer wishlist | `/account/favourites` |
| Store management | `/admin` |
| Products | `/admin/products` |
| Stock matrix | `/admin/stock` |
| Collections | `/admin/collections` |
| Discount codes | `/admin/discounts` |
| Orders | `/admin/orders` |
| Reviews | `/admin/reviews` |
| Health check | `/api/health` |

---

## Final checklist

### Supabase

- [ ] Supabase project created in the correct region
- [ ] Strong database password stored securely
- [ ] Entire `supabase-setup.sql` executed successfully
- [ ] All 12 tables visible in Table Editor
- [ ] Product and stock row counts verified
- [ ] RLS enabled on all application tables
- [ ] Session pooler URL copied
- [ ] Password URL-encoded if necessary
- [ ] `sslmode=require` included

### Environment

- [ ] `DATABASE_URL` configured
- [ ] `ADMIN_EMAIL` configured
- [ ] Strong `ADMIN_PASSWORD` configured
- [ ] Random `ADMIN_SECRET` configured
- [ ] Different random `CUSTOMER_SECRET` configured
- [ ] `.env` files excluded from Git
- [ ] Deployment rebuilt after environment changes

### Functional testing

- [ ] `/api/health` returns `{"ok":true}`
- [ ] Storefront products load from Supabase
- [ ] Admin login works through `/admin`
- [ ] Existing products can be edited
- [ ] New products appear on the storefront
- [ ] Variant stock updates from `/admin/stock`
- [ ] Out-of-stock purchases are blocked
- [ ] Customer sign-up and sign-in work
- [ ] Wishlist persists
- [ ] Checkout creates a customer-linked order
- [ ] Admin status update appears in order tracking
- [ ] Delivered-order review appears on the product page

---

## Official references

- [Supabase — Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase — Database overview](https://supabase.com/docs/guides/database/overview)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Database backups](https://supabase.com/docs/guides/platform/backups)
- [Next.js — Deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Drizzle ORM — PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
