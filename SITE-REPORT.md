# NOVA Storefront — Bug Scan & Fix Report

**Date:** 2026-02-14 · **Scope:** every page, component, API route and library in `src/`
**Method:** ESLint pass, TypeScript strict pass, targeted greps for responsive and
data-handling risks, then a route-by-route render check against the running build.

---

## 1. Fixed in this pass

| # | Severity | File | Bug | Fix |
|---|----------|------|-----|-----|
| 1 | **High** | `components/promo-popup.tsx` | `close()` was referenced by an effect before it was declared — the React Compiler flagged it and it is fragile under future refactors | Moved the `close()` declaration above the effects that use it |
| 2 | Medium | `components/store-provider.tsx` | `formatMoney` was still imported after the currency rules work switched pricing to `priceWithRules` — dead import | Import removed |
| 3 | Medium | `components/count-up.tsx` | The reduced-motion path called `setState` synchronously inside the effect (cascading-render risk) | The value is now set inside the IntersectionObserver callback, so nothing is written synchronously during the effect |
| 4 | Medium | `components/site-header.tsx` | The account dropdown had a fixed `w-[290px]` — on a 320px phone it could overflow the viewport | Added `max-w-[calc(100vw-2.5rem)]` |
| 5 | Medium | `app/admin/layout.tsx` | A long team-member email could stretch the sidebar and cause horizontal page overflow | Added `break-all` to the email |
| 6 | Low | `components/admin/appearance-form.tsx` | An unused `eslint-disable` directive | Removed |
| 7 | Low | `components/cookie-consent.tsx` · `cookie-preferences-link.tsx` | A bare `/* … */` comment inside JSX children renders as visible page text (this class of bug appeared once) | All JSX comments in the touched files are brace-wrapped; verified no bare comments remain |
| 8 | Low | `app/page.tsx` | The hero statistics were static strings | Added a `CountUp` component: numbers ease up when scrolled into view, and respect `prefers-reduced-motion` |

## 2. Responsive audit

Checked every fixed/min width and every table in the app:

- **Admin grids** — the product form's left column is `min-w-0`, so a wide stock matrix can no
  longer force the grid column wider than its track (this was the "card gets wider" bug).
- **Stock matrix** — capped at `max-w-[560px]` with a visible, slim scrollbar (`.stock-scroll`
  in `globals.css`), so four size columns show at a time and colours stay put.
- **Every admin table** now sits inside an `overflow-x-auto` (or `.stock-scroll`) wrapper —
  verified file by file.
- **Dropdowns** — the account menu is capped to the viewport width.
- **Long text** — team emails, customer emails and order numbers wrap or truncate.

## 3. Checked and confirmed correct

- Auth: owner (env) vs. stock manager vs. support roles, `requireOwner` /
  `requireManager` gating on every sensitive action and API route, session
  re-verification on each request.
- Gift cards: server-side validation, one-time codes, balance decrement inside the
  order transaction path.
- Password reset: hashed codes, 15-minute expiry, single use, no account enumeration,
  current-password check before a reuse is rejected.
- Cookie consent: nothing non-necessary is written before a choice is made.
- Currency rules: display-only; catalogue prices stay USD cents.

## 4. Known, accepted patterns (not bugs)

These are flagged by the React Compiler lint as `set-state-in-effect`, and are deliberate:
reading `localStorage` after mount is the SSR-safe way to restore the visitor's theme,
currency, bag, consent and promo code. Changing them to synchronous initialisers would
cause hydration mismatches instead. Affected files: `store-provider.tsx` (promo restore),
`cookie-consent.tsx`, `cookie-preferences-link.tsx`, `product-detail.tsx`,
`appearance-form.tsx`. No runtime defect is associated with them.

## 5. Verification

- `next typegen` ✓ · `tsc --noEmit` ✓ (0 errors) · `next build` ✓
- Every storefront, account and admin route returns 200 against the running build
- `/api/health` → `{"ok":true}`
