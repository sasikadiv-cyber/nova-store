"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  collections,
  contactMessages,
  currencyRules,
  discountCodes,
  giftCards,
  orderEvents,
  orderItems,
  orders,
  products,
  reviews,
  sitePages,
  type ColorOption,
  adminUsers,
} from "@/db/schema";
import {
  createAdminSession,
  destroyAdminSession,
  hashAdminPassword,
  recordAdminLogin,
  requireAdmin,
  requireManager,
  requireOwner,
  verifyAdminPassword,
  verifyCredentials,
} from "@/lib/auth";
import { invalidateCatalogue } from "@/lib/cache";
import { generateGiftCardCode } from "@/lib/gift-cards";
import { slugify } from "@/lib/product-form";
import { ORDER_FLOW } from "@/lib/customer-queries";
import { rateLimit } from "@/lib/security";

/* ------------------------------------------------------------------ helpers */

function text(form: FormData, key: string, fallback = "") {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function numeric(form: FormData, key: string, fallback = 0) {
  const value = Number(text(form, key));
  return Number.isFinite(value) ? value : fallback;
}

function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function list(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}



function refreshStore() {
  revalidatePath("/", "layout");
  /* Drop the tagged catalogue cache too, so the next storefront request reads
     fresh data instead of waiting out the time-based expiry. */
  invalidateCatalogue();
}

/* --------------------------------------------------------------------- auth */

export type AdminLoginState = { error: string | null };

/**
 * Returns the failure on the form instead of redirecting, so the console can
 * tell the owner exactly what went wrong (bad email, bad password).
 */
export async function loginAction(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = text(formData, "email");
  const password = text(formData, "password");

  /* Throttle the console sign-in: five attempts a minute per caller, exactly
     like the client sign-in route. Slows online brute force to a crawl. */
  const incoming = await headers();
  const ip =
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    incoming.get("x-real-ip") ||
    "unknown";
  const verdict = rateLimit(`admin-login:${ip}`, 5, 60);
  if (!verdict.ok) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const admin = await verifyCredentials(email, password);
  if (!admin) {
    return { error: "Incorrect email or password. Please check both and try again." };
  }

  await recordAdminLogin(admin.id);
  await createAdminSession(admin);
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin");
}

/* ----------------------------------------------------------------- products */

export async function deleteProductAction(formData: FormData) {
  await requireManager();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db.delete(products).where(eq(products.id, id));
  }
  refreshStore();
  redirect("/admin/products?deleted=1");
}

export async function updateStockAction(formData: FormData) {
  await requireManager();
  const id = numeric(formData, "id", 0);
  const stock = Math.max(0, Math.round(numeric(formData, "stock", 0)));
  if (id > 0) {
    await db.update(products).set({ stock }).where(eq(products.id, id));
  }
  refreshStore();
  redirect("/admin/products?saved=1");
}

export async function toggleFlagAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const field = text(formData, "field");

  const allowed = {
    isFeatured: products.isFeatured,
    isNewArrival: products.isNewArrival,
    isBestSeller: products.isBestSeller,
  } as const;

  const column = allowed[field as keyof typeof allowed];
  if (id > 0 && column) {
    await db
      .update(products)
      .set({ [field]: sql`not ${column}` })
      .where(eq(products.id, id));
  }
  refreshStore();
  redirect("/admin/products?saved=1");
}

/** Sitewide / per-category discount tool.
 *  mode = apply    → move the current price into compare-at, then reduce it
 *  mode = clear    → keep the current price, drop the sale badge
 *  mode = restore  → roll back to the compare-at price
 */
export async function applyDiscountAction(formData: FormData) {
  await requireManager();
  const mode = text(formData, "mode", "apply");
  const category = text(formData, "category");
  const scope = category ? eq(products.category, category) : undefined;

  if (mode === "clear") {
    await db
      .update(products)
      .set({ compareAtCents: null })
      .where(scope ?? sql`true`);
    refreshStore();
    redirect("/admin/products?cleared=1");
  }

  if (mode === "restore") {
    await db
      .update(products)
      .set({
        priceCents: sql`${products.compareAtCents}`,
        compareAtCents: null,
      })
      .where(scope ? sql`${products.compareAtCents} is not null and ${scope}` : sql`${products.compareAtCents} is not null`);
    refreshStore();
    redirect("/admin/products?restored=1");
  }

  const percent = Math.min(70, Math.max(0, numeric(formData, "percent", 0)));
  if (percent <= 0) {
    redirect("/admin/products?cleared=1");
  }

  /* percent is clamped to 0-70 above, so inlining it as a literal is safe and
     keeps Postgres from inferring an integer parameter (round(int) is invalid). */
  const factor = sql.raw((1 - percent / 100).toFixed(4));
  const patch = {
    compareAtCents: sql`${products.priceCents}`,
    priceCents: sql`round(${products.priceCents} * ${factor})::int`,
  };

  if (category) {
    await db.update(products).set(patch).where(eq(products.category, category));
  } else {
    await db.update(products).set(patch);
  }

  refreshStore();
  redirect("/admin/products?discount=1");
}

/* -------------------------------------------------------------- collections */

export async function saveCollectionAction(formData: FormData) {
  await requireManager();

  const id = numeric(formData, "id", 0);
  const name = text(formData, "name") || "New collection";

  const values = {
    slug: slugify(text(formData, "slug") || name),
    name,
    tagline: text(formData, "tagline"),
    description: text(formData, "description"),
    image:
      text(formData, "image") ||
      "https://images.pexels.com/photos/30569741/pexels-photo-30569741.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500",
    accent: text(formData, "accent") || "#17150f",
    sortOrder: Math.round(numeric(formData, "sortOrder", 99)),
  };

  if (id > 0) {
    await db.update(collections).set(values).where(eq(collections.id, id));
  } else {
    await db.insert(collections).values(values);
  }

  refreshStore();
  redirect("/admin/collections?saved=1");
}

/* ------------------------------------------------------------------- orders */

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const status = text(formData, "status") || "confirmed";
  const note = text(formData, "note");
  const tracking = text(formData, "tracking");

  if (id <= 0) redirect("/admin/orders");

  await db
    .update(orders)
    .set({
      status,
      ...(tracking ? { trackingNumber: tracking } : {}),
    })
    .where(eq(orders.id, id));

  /* Every change becomes a tracking step the client sees in their account. */
  await db.insert(orderEvents).values({
    orderId: id,
    status,
    note:
      note ||
      ORDER_FLOW.find((step) => step.id === status)?.blurb ||
      "Status updated by the store.",
  });

  revalidatePath("/admin/orders");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  refreshStore();
  redirect("/admin/orders?saved=1");
}

export async function deleteOrderAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }
  revalidatePath("/admin/orders");
  redirect("/admin/orders?deleted=1");
}

/* ------------------------------------------------------------------ reviews */

export async function deleteReviewAction(formData: FormData) {
  await requireAdmin();
  const id = numeric(formData, "id", 0);
  const productId = numeric(formData, "productId", 0);
  if (id > 0) {
    await db.delete(reviews).where(eq(reviews.id, id));
  }
  if (productId > 0) {
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
  refreshStore();
  redirect("/admin/reviews?deleted=1");
}

/* ------------------------------------------------------------ discount codes */

function toDate(form: FormData, key: string) {
  const raw = text(form, key);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `NOVA${out}`;
}

export async function saveDiscountAction(formData: FormData) {
  await requireManager();

  const id = numeric(formData, "id", 0);
  const rawCode = text(formData, "code").toUpperCase();
  const code = rawCode.replace(/[^A-Z0-9-]/g, "").slice(0, 20) || randomCode();
  const type = text(formData, "type") === "fixed" ? "fixed" : "percent";
  const scope = ["all", "category", "collection", "product"].includes(text(formData, "scope"))
    ? text(formData, "scope")
    : "all";

  const value =
    type === "percent"
      ? Math.min(70, Math.max(1, Math.round(numeric(formData, "value", 10))))
      : Math.max(1, Math.round(numeric(formData, "value", 10) * 100));

  const values = {
    code,
    label: text(formData, "label"),
    type,
    value,
    scope,
    scopeValue: scope === "all" ? "" : text(formData, "scopeValue"),
    minSubtotalCents: Math.max(0, Math.round(numeric(formData, "minSubtotal", 0) * 100)),
    maxRedemptions: numeric(formData, "maxRedemptions", 0) > 0
      ? Math.round(numeric(formData, "maxRedemptions", 0))
      : null,
    startsAt: toDate(formData, "startsAt"),
    endsAt: toDate(formData, "endsAt"),
    active: bool(formData, "active"),
  };

  if (id > 0) {
    await db.update(discountCodes).set(values).where(eq(discountCodes.id, id));
  } else {
    await db.insert(discountCodes).values(values).onConflictDoNothing({ target: discountCodes.code });
  }

  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?saved=1");
}

export async function toggleDiscountAction(formData: FormData) {
  await requireManager();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db
      .update(discountCodes)
      .set({ active: sql`not ${discountCodes.active}` })
      .where(eq(discountCodes.id, id));
  }
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?saved=1");
}

export async function deleteDiscountAction(formData: FormData) {
  await requireManager();
  const id = numeric(formData, "id", 0);
  if (id > 0) {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
  }
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?deleted=1");
}

/* ------------------------------------------------------- editable site pages */

export async function saveSitePageAction(formData: FormData) {
  await requireOwner();

  const slug = text(formData, "slug");
  const title = text(formData, "title");
  const eyebrow = text(formData, "eyebrow");
  const intro = text(formData, "intro");
  const published = bool(formData, "published");

  const headings = formData.getAll("block_heading").map((value) => String(value).trim());
  const bodies = formData.getAll("block_body").map((value) => String(value));

  const blocks = headings
    .map((heading, index) => ({
      heading,
      body: (bodies[index] ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }))
    .filter((block) => block.heading.length > 0 || block.body.length > 0);

  await db
    .insert(sitePages)
    .values({ slug, title, eyebrow, intro, blocks, published })
    .onConflictDoUpdate({
      target: sitePages.slug,
      set: { title, eyebrow, intro, blocks, published, updatedAt: new Date() },
    });

  refreshStore();
  redirect(`/admin/pages?saved=${encodeURIComponent(slug)}`);
}

export async function togglePagePublishedAction(formData: FormData) {
  await requireOwner();

  const slug = text(formData, "slug");
  const [page] = await db.select().from(sitePages).where(eq(sitePages.slug, slug)).limit(1);
  if (page) {
    await db
      .update(sitePages)
      .set({ published: !page.published, updatedAt: new Date() })
      .where(eq(sitePages.slug, slug));
  }

  refreshStore();
  redirect("/admin/pages");
}

/* --------------------------------------------------------- contact messages */

export async function markMessageHandledAction(formData: FormData) {
  await requireAdmin();

  const id = Math.round(Number(text(formData, "id", "0")));
  const [message] = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, id))
    .limit(1);
  if (message) {
    await db
      .update(contactMessages)
      .set({ handled: !message.handled })
      .where(eq(contactMessages.id, id));
  }

  revalidatePath("/admin/messages");
}

/* ------------------------------------------------------------- gift cards */

export async function createGiftCardAction(formData: FormData) {
  await requireManager();

  const amount = Math.round(Number(text(formData, "amount", "0")));
  const note = text(formData, "note");

  if (!Number.isFinite(amount) || amount < 1000) {
    redirect("/admin/gift-cards?error=Enter+an+amount+of+at+least+$10");
  }

  const code = text(formData, "code") || generateGiftCardCode();
  await db
    .insert(giftCards)
    .values({ code: code.toUpperCase(), initialCents: amount, balanceCents: amount, note })
    .onConflictDoNothing({ target: giftCards.code });

  revalidatePath("/admin/gift-cards");
  redirect(`/admin/gift-cards?created=${encodeURIComponent(code.toUpperCase())}`);
}

export async function toggleGiftCardAction(formData: FormData) {
  await requireManager();

  const id = Math.round(Number(text(formData, "id", "0")));
  const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (card) {
    await db
      .update(giftCards)
      .set({ active: !card.active, updatedAt: new Date() })
      .where(eq(giftCards.id, id));
  }

  revalidatePath("/admin/gift-cards");
}

export async function topUpGiftCardAction(formData: FormData) {
  await requireManager();

  const id = Math.round(Number(text(formData, "id", "0")));
  const amount = Math.round(Number(text(formData, "amount", "0")));

  if (!Number.isFinite(amount) || amount <= 0) {
    redirect("/admin/gift-cards?error=Enter+a+top-up+amount");
  }

  const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (card) {
    await db
      .update(giftCards)
      .set({
        balanceCents: card.balanceCents + amount,
        initialCents: card.initialCents + amount,
        updatedAt: new Date(),
      })
      .where(eq(giftCards.id, id));
  }

  revalidatePath("/admin/gift-cards");
}

/* -------------------------------------------------------- currency rules */

export async function saveCurrencyRuleAction(formData: FormData) {
  await requireOwner();

  const code = text(formData, "code").toUpperCase();
  const fxRate = Number(text(formData, "fxRate", "1"));
  const markupPercent = Number(text(formData, "markupPercent", "0"));
  const rounding = text(formData, "rounding", "none");
  const active = bool(formData, "active");

  if (!code || !Number.isFinite(fxRate) || fxRate <= 0) {
    redirect("/admin/currency?error=Enter+a+valid+exchange+rate");
  }

  await db
    .insert(currencyRules)
    .values({
      code,
      fxRate,
      markupPercent: Number.isFinite(markupPercent) ? markupPercent : 0,
      rounding: ["none", "nearest_5", "nearest_9", "nearest_10"].includes(rounding)
        ? rounding
        : "none",
      active,
    })
    .onConflictDoUpdate({
      target: currencyRules.code,
      set: {
        fxRate,
        markupPercent: Number.isFinite(markupPercent) ? markupPercent : 0,
        rounding: ["none", "nearest_5", "nearest_9", "nearest_10"].includes(rounding)
          ? rounding
          : "none",
        active,
        updatedAt: new Date(),
      },
    });

  refreshStore();
  redirect(`/admin/currency?saved=${encodeURIComponent(code)}`);
}

/* ------------------------------------------------------------- team access */

export async function createStockManagerAction(formData: FormData) {
  await requireOwner();

  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (name.length < 2) {
    redirect("/admin/team?error=Enter+the+team+member's+name");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/admin/team?error=Enter+a+valid+email+address");
  }
  if (password.length < 8) {
    redirect("/admin/team?error=Password+must+be+at+least+8+characters");
  }

  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
  if (existing.length > 0) {
    redirect("/admin/team?error=That+email+already+has+console+access");
  }

  const role = text(formData, "role") === "support" ? "support" : "stock_manager";

  await db.insert(adminUsers).values({
    email,
    name,
    passwordHash: hashAdminPassword(password),
    role,
  });

  revalidatePath("/admin/team");
  redirect(
    `/admin/team?created=${encodeURIComponent(email)}&role=${role}`,
  );
}

export async function toggleStockManagerAction(formData: FormData) {
  await requireOwner();

  const id = Math.round(Number(text(formData, "id", "0")));
  const [member] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (member) {
    await db.update(adminUsers).set({ active: !member.active }).where(eq(adminUsers.id, id));
  }

  revalidatePath("/admin/team");
}

export async function deleteStockManagerAction(formData: FormData) {
  await requireOwner();

  const id = Math.round(Number(text(formData, "id", "0")));
  await db.delete(adminUsers).where(eq(adminUsers.id, id));

  revalidatePath("/admin/team");
}

export async function changeAdminPasswordAction(formData: FormData) {
  const admin = await requireManager();

  /* The owner's credentials live in the environment, not the table. */
  if (admin.role === "owner") {
    redirect("/admin/profile?error=The+owner+password+is+set+in+the+environment");
  }

  const next = text(formData, "password");
  if (next.length < 8) {
    redirect("/admin/profile?error=Password+must+be+at+least+8+characters");
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: hashAdminPassword(next) })
    .where(eq(adminUsers.id, admin.id));

  redirect("/admin/profile?saved=password");
}

/**
 * The owner resets a team member's password. Verification is required: the
 * owner must re-enter their own console password, so a shared or stolen
 * browser session cannot quietly take over a team account.
 */
export async function resetStockManagerPasswordAction(formData: FormData) {
  const owner = await requireOwner();

  const id = Math.round(Number(text(formData, "id", "0")));
  const password = text(formData, "password");
  const ownerPassword = text(formData, "ownerPassword");

  const [member] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!member) {
    redirect("/admin/team?error=That+account+no+longer+exists");
  }

  /* Verification step — the owner's own credentials. */
  const verified = await verifyCredentials(owner.email, ownerPassword);
  if (!verified || verified.role !== "owner") {
    redirect("/admin/team?error=Verification+failed+-+check+your+owner+password");
  }

  if (password.length < 8) {
    redirect("/admin/team?error=New+password+must+be+at+least+8+characters");
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: hashAdminPassword(password) })
    .where(eq(adminUsers.id, id));

  revalidatePath("/admin/team");
  redirect(`/admin/team?reset=${encodeURIComponent(member.email)}`);
}

/* -------------------------------------------------- team account editing */

/**
 * The owner rewrites a team account's name, email, role and — optionally —
 * its password in one place. Verification is required: the owner re-enters
 * their own console password, so a shared browser cannot take over accounts.
 */
export async function updateStockManagerAction(formData: FormData) {
  const owner = await requireOwner();

  const id = Math.round(Number(text(formData, "id", "0")));
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") === "support" ? "support" : "stock_manager";
  const password = text(formData, "password");
  const ownerPassword = text(formData, "ownerPassword");

  const [member] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!member) {
    redirect("/admin/team?error=That+account+no+longer+exists");
  }

  /* Verification step — the owner's own credentials. */
  const verified = await verifyCredentials(owner.email, ownerPassword);
  if (!verified || verified.role !== "owner") {
    redirect("/admin/team?error=Verification+failed+-+check+your+owner+password");
  }

  if (name.length < 2) {
    redirect("/admin/team?error=Enter+the+team+member's+name");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/admin/team?error=Enter+a+valid+email+address");
  }
  if (password && password.length < 8) {
    redirect("/admin/team?error=Password+must+be+at+least+8+characters");
  }

  const clash = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
  if (clash.some((row) => row.id !== id)) {
    redirect("/admin/team?error=That+email+already+belongs+to+another+account");
  }

  await db
    .update(adminUsers)
    .set({
      name,
      email,
      role,
      ...(password ? { passwordHash: hashAdminPassword(password) } : {}),
    })
    .where(eq(adminUsers.id, id));

  revalidatePath("/admin/team");
  redirect(`/admin/team?saved=${encodeURIComponent(email)}`);
}

/** A console user edits their own name and email, and may rotate their password. */
export async function updateOwnAdminProfileAction(formData: FormData) {
  const admin = await requireAdmin();

  /* The owner's identity lives in the environment. */
  if (admin.role === "owner") {
    redirect("/admin/profile?error=The+owner+email+and+password+are+set+in+the+environment");
  }

  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const currentPassword = text(formData, "currentPassword");
  const newPassword = text(formData, "newPassword");

  if (name.length < 2) {
    redirect("/admin/profile?error=Enter+your+name");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/admin/profile?error=Enter+a+valid+email+address");
  }

  const [member] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id)).limit(1);
  if (!member) {
    redirect("/admin/profile?error=Account+not+found");
  }

  /* Changing your own password needs the current one. */
  if (newPassword) {
    if (!verifyAdminPassword(currentPassword, member.passwordHash)) {
      redirect("/admin/profile?error=Your+current+password+is+not+correct");
    }
    if (newPassword.length < 8) {
      redirect("/admin/profile?error=New+password+must+be+at+least+8+characters");
    }
  }

  const clash = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
  if (clash.some((row) => row.id !== admin.id)) {
    redirect("/admin/profile?error=That+email+already+belongs+to+another+account");
  }

  await db
    .update(adminUsers)
    .set({
      name,
      email,
      ...(newPassword ? { passwordHash: hashAdminPassword(newPassword) } : {}),
    })
    .where(eq(adminUsers.id, admin.id));

  revalidatePath("/", "layout");
  redirect("/admin/profile?saved=1");
}
