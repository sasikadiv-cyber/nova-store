"use client";

import { useEffect } from "react";

import { useStore } from "./store-provider";

/**
 * Clearing the bag after a Stripe redirect. When the embedded Checkout
 * completes, the browser leaves for the success URL — local React state is
 * lost in between, so the bag is emptied here once the confirmed-order page
 * mounts.
 */
export function ClearCart() {
  const { clearCart, hydrated } = useStore();

  useEffect(() => {
    if (hydrated) clearCart();
  }, [hydrated, clearCart]);

  return null;
}
