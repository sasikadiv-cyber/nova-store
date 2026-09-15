# NOVA Storefront — Security Audit & Hardening Report

**Scope:** every route handler, server action, library and page in `src/`
**Method:** manual OWASP-style review (secrets, injection, XSS, CSRF, auth,
IDOR, rate limiting, transport security) plus live verification against the
running production build.

---

## 1. Critical findings — fixed

| # | Severity | Location | Finding | Fix |
|---|----------|----------|---------|-----|
| 1 | **Critical** | `lib/auth.ts` | The admin session signing key fell back to a **hard-coded, publicly visible value** (`nova-atelier-signing-key-2026`). Anyone reading the repository could forge a valid owner session cookie and take over the console. | Production now **refuses to boot** unless `ADMIN_SECRET` is set to a unique value. `NEXT_PHASE` is respected so `next build` still succeeds. |
| 2 | **Critical** | `lib/customer-auth.ts` | Same class of issue for customer sessions. | Same rule for `CUSTOMER_SECRET`. |
| 3 | **Critical** | `api/seed` | Database-write endpoint with **no authentication at all** — anyone on the internet could trigger writes to the catalogue. | Now gated behind `requireOwner()`. Verified: unauthenticated `GET`/`POST` redirect to the console sign-in. |
| 4 | **High** | `next.config.ts` | No security headers: the app could be framed (clickjacking), MIME-sniffed, and had no transport-security or CSP policy. | Added `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo/payment/usb disabled) and `Strict-Transport-Security` with preload. Verified present on responses. |
| 5 | **High** | all write endpoints | **No rate limiting** — sign-in, password-reset, contact, reviews and newsletter could be brute-forced or spammed. | New `lib/security.ts` provides a shared `guard()` (same-origin + sliding-window counter). Limits applied per endpoint (see §3). Verified: 6th login attempt → `429`. |
| 6 | **High** | several routes | POST handlers without a same-origin check → **CSRF** possible. | All state-changing handlers now reject cross-origin posts. Verified: cross-origin `POST /api/contact` → `403`. |
| 7 | **High** | `api/customer/reset` | A 6-digit code in a 15-minute window with **no attempt limit** — brute-forceable (1M combinations). | Per-email counter: 5 attempts per 15 minutes, plus 4 code requests per 5 minutes per IP. Verified: 6th attempt → `429`. |
| 8 | **Medium** | `products/[slug]/page.tsx` | JSON-LD injected with `JSON.stringify` into a `<script>` tag — a product field containing `</script>` would break out into markup (**stored XSS** via the console). | New `safeJsonLd()` escapes `<` and `-->` before serialisation. |

## 2. Medium findings — fixed

| # | Location | Finding | Fix |
|---|----------|---------|-----|
| 9 | `api/admin/stock`, `api/admin/stock/batch` | Stock writes accepted **any** console user, including the read-only *client support* role. | Tightened from `isAdmin()` to `requireManager()` (owner or stock manager only). |
| 10 | repo | No `.env.example`, so a new deployment could silently fall back to the insecure signing keys. | Added `.env.example` documenting every variable and how to generate the secrets. |

## 3. Endpoint limits now in force

| Endpoint | Scope | Limit |
|----------|-------|-------|
| `POST /api/customer/session` (sign in / sign up) | per IP | 5 / minute |
| `POST /api/customer/reset` (request code) | per IP | 4 / 5 minutes |
| `PUT /api/customer/reset` (submit code) | per email | 5 / 15 minutes |
| `POST /api/contact` | per IP | 5 / 10 minutes |
| `POST /api/newsletter` | per IP | 5 / 10 minutes |
| `POST /api/reviews` | per IP | 5 / hour |
| `POST /api/orders` | per IP | 12 / 10 minutes |
| `POST /api/discounts/validate` | per IP | 30 / minute |

## 4. Reviewed and confirmed already safe

- **SQL injection** — all queries go through Drizzle's parameterised builder. The 8 raw
  `sql` fragments interpolate **column references only** (`sql`not ${column}``), never user
  input, so they cannot be injected.
- **XSS** — no `dangerouslySetInnerHTML` on user data. The two remaining uses are a
  hard-coded theme bootstrap string and the now-escaped JSON-LD.
- **IDOR** — orders, reviews, favourites and payment-free account data are all scoped by
  `customer.id` from the signed session, never from a client-supplied id.
- **Price tampering** — totals, discounts, gift-card balances and stock are all recomputed
  server-side in `createOrder()`; nothing is trusted from the client.
- **Gift cards** — single-use codes, server-validated balance, decrement inside the write path.
- **Password reset** — SHA-256-hashed codes, 15-minute expiry, single use, no account
  enumeration, reuse of the current password rejected before the code is consumed.
- **Console roles** — owner / stock manager / support, gated per action via
  `requireOwner` / `requireManager` / `requireAdmin`, and team members are re-verified
  against the database on every request so suspension is immediate.
- **Payment data** — saved cards were removed entirely (table, page and actions), so there
  is no card data to leak.
- **Passwords** — scrypt with a per-user random salt; hashes are excluded from the SQL dumps.

## 5. Required for production

Set these in the hosting platform (they are **mandatory** now — the app will not start
without them):

```
DATABASE_URL=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...        # a long, unique value
ADMIN_SECRET=$(openssl rand -base64 48)
CUSTOMER_SECRET=$(openssl rand -base64 48)
```

## 6. Verification

- `next typegen` ✓ · `tsc --noEmit` ✓ (0 errors) · `next build` ✓
- Security headers present on live responses ✓
- Login rate limit returns `429` on the 6th attempt ✓
- Reset-code brute force returns `429` on the 6th attempt ✓
- `/api/seed` unauthenticated → redirect to console sign-in ✓
- Cross-origin `POST` → `403` ✓
- `/api/health` → `{"ok":true}` ✓
