"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { customers, favourites, paymentMethods, reviews } from "@/db/schema";
import {
  createCustomerSession,
  destroyCustomerSession,
  getCurrentCustomer,
  hashPassword,
  verifyPassword,
} from "@/lib/customer-auth";
import { resyncProductRating } from "@/lib/customer-queries";

function text(form: FormData, key: string, fallback = "") {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

/* ------------------------------------------------------------------ account */

export async function signUpAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const fullName = text(formData, "fullName");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/account/login?error=Enter%20a%20valid%20email%20address&mode=signup");
  }
  if (password.length < 8) {
    redirect("/account/login?error=Password%20must%20be%20at%20least%208%20characters&mode=signup");
  }
  if (fullName.length < 2) {
    redirect("/account/login?error=Please%20enter%20your%20full%20name&mode=signup");
  }

  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);

  if (existing) {
    redirect("/account/login?error=That%20email%20already%20has%20an%20account&mode=signup");
  }

  const [customer] = await db
    .insert(customers)
    .values({ email, fullName, passwordHash: hashPassword(password) })
    .returning();

  await createCustomerSession(customer.id);
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signInAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);

  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    redirect("/account/login?error=That%20email%20and%20password%20do%20not%20match");
  }

  await createCustomerSession(customer.id);
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signOutAction() {
  await destroyCustomerSession();
  revalidatePath("/", "layout");
  redirect("/account/login");
}

/* ------------------------------------------------------------------ profile */

export async function updateProfileAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const fullName = text(formData, "fullName");
  if (fullName.length < 2) {
    redirect("/account/profile?error=Please+enter+your+full+name");
  }

  await db
    .update(customers)
    .set({
      fullName,
      phone: text(formData, "phone"),
      defaultAddress1: text(formData, "address1"),
      defaultAddress2: text(formData, "address2"),
      defaultCity: text(formData, "city"),
      defaultRegion: text(formData, "region"),
      defaultPostalCode: text(formData, "postalCode"),
      defaultCountry: text(formData, "country"),
    })
    .where(eq(customers.id, customer.id));

  revalidatePath("/", "layout");
  redirect("/account/profile?saved=1");
}

export async function changePasswordAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const current = text(formData, "currentPassword");
  const next = text(formData, "newPassword");

  if (!verifyPassword(current, customer.passwordHash)) {
    redirect("/account/profile?error=Your+current+password+is+incorrect");
  }
  if (next.length < 8) {
    redirect("/account/profile?error=New+password+must+be+at+least+8+characters");
  }

  await db
    .update(customers)
    .set({ passwordHash: hashPassword(next) })
    .where(eq(customers.id, customer.id));

  redirect("/account/profile?saved=password");
}

/* ---------------------------------------------------------- payment methods */

export async function addPaymentMethodAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const digits = text(formData, "cardNumber").replace(/\D/g, "");
  const last4 = digits.slice(-4);
  const expMonth = Math.round(Number(text(formData, "expMonth", "1")));
  const expYear = Math.round(Number(text(formData, "expYear", String(new Date().getFullYear()))));

  if (digits.length < 15 || last4.length !== 4) {
    redirect("/account/payment?error=Enter+a+valid+card+number");
  }
  if (expMonth < 1 || expMonth > 12) {
    redirect("/account/payment?error=Enter+a+valid+expiry+month");
  }
  if (expYear < new Date().getFullYear()) {
    redirect("/account/payment?error=That+card+has+already+expired");
  }

  const brand =
    digits.startsWith("4") ? "Visa"
    : digits.startsWith("5") ? "Mastercard"
    : digits.startsWith("3") ? "Amex"
    : "Card";

  const existing = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(eq(paymentMethods.customerId, customer.id));

  await db.insert(paymentMethods).values({
    customerId: customer.id,
    brand,
    last4,
    expMonth,
    expYear,
    isDefault: existing.length === 0,
  });

  revalidatePath("/account/payment");
  redirect("/account/payment?saved=1");
}

export async function setDefaultPaymentAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const id = Math.round(Number(text(formData, "id", "0")));
  await db
    .update(paymentMethods)
    .set({ isDefault: false })
    .where(eq(paymentMethods.customerId, customer.id));
  await db
    .update(paymentMethods)
    .set({ isDefault: true })
    .where(eq(paymentMethods.id, id));

  revalidatePath("/account/payment");
  redirect("/account/payment?saved=default");
}

export async function deletePaymentMethodAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const id = Math.round(Number(text(formData, "id", "0")));
  await db.delete(paymentMethods).where(eq(paymentMethods.id, id));

  // keep exactly one default if any card remains
  const remaining = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.customerId, customer.id));
  if (remaining.length > 0 && !remaining.some((card) => card.isDefault)) {
    await db
      .update(paymentMethods)
      .set({ isDefault: true })
      .where(eq(paymentMethods.id, remaining[0].id));
  }

  revalidatePath("/account/payment");
  redirect("/account/payment?saved=removed");
}

/* ------------------------------------------------------------------- reviews */

export async function deleteCustomerReviewAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const id = Math.round(Number(text(formData, "id", "0")));
  const [row] = await db
    .select({ productId: reviews.productId })
    .from(reviews)
    .where(eq(reviews.id, id))
    .limit(1);

  if (row) {
    await db.delete(reviews).where(eq(reviews.id, id));
    await resyncProductRating(row.productId);
  }

  revalidatePath("/account/reviews");
  redirect("/account/reviews?saved=removed");
}


/* -------------------------------------------------------------- wishlist */

export async function toggleFavouriteAction(formData: FormData) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");

  const productId = Math.round(Number(text(formData, "productId", "0")));
  const redirectTo = text(formData, "redirectTo", "/account/favourites");
  if (productId > 0) {
    const [existing] = await db
      .select({ id: favourites.id })
      .from(favourites)
      .where(and(eq(favourites.customerId, customer.id), eq(favourites.productId, productId)))
      .limit(1);

    if (existing) {
      await db.delete(favourites).where(eq(favourites.id, existing.id));
    } else {
      await db.insert(favourites).values({ customerId: customer.id, productId }).onConflictDoNothing();
    }
  }

  revalidatePath("/account/favourites");
  revalidatePath("/", "layout");
  redirect(redirectTo);
}
