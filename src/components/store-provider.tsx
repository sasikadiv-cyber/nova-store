"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { formatMoney, type CurrencyCode } from "@/lib/currency";

export type CartLine = {
  key: string;
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  priceCents: number;
  compareAtCents: number | null;
  size: string;
  color: string;
  quantity: number;
  maxQuantity: number;
};

export type AddToCartInput = Omit<CartLine, "key" | "quantity"> & { quantity?: number };

export type Theme = "light" | "dark";

export type SessionCustomer = {
  id: number;
  email: string;
  fullName: string;
};

export type Promo = {
  code: string;
  label: string;
  summary: string;
  discountCents: number;
};

export type PromoStatus = "idle" | "checking" | "applied" | "error";

type StoreValue = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  currency: CurrencyCode;
  theme: Theme;
  isOpen: boolean;
  hydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: AddToCartInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  promo: Promo | null;
  promoStatus: PromoStatus;
  promoError: string | null;
  applyPromo: (code: string) => Promise<boolean>;
  clearPromo: () => void;
  customer: SessionCustomer | null;
  sessionReady: boolean;
  favourites: number[];
  favouritesReady: boolean;
  toggleFavourite: (productId: number) => Promise<"saved" | "removed" | "auth">;
  setCurrency: (code: CurrencyCode) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  price: (cents: number) => string;
};

const StoreContext = createContext<StoreValue | null>(null);
const CART_KEY = "nova.cart.v2";
const CURRENCY_KEY = "nova.currency";
const PROMO_KEY = "nova.promo";
export const THEME_KEY = "nova.theme";
export const FREE_SHIPPING_THRESHOLD = 25000;

function lineKey(slug: string, size: string, color: string) {
  return `${slug}__${size}__${color}`;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [theme, setThemeState] = useState<Theme>("light");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoStatus, setPromoStatus] = useState<PromoStatus>("idle");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [favouritesReady, setFavouritesReady] = useState(false);
  const [customer, setCustomer] = useState<SessionCustomer | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollLockRef = useRef(false);

  useEffect(() => {
    try {
      const rawCart = window.localStorage.getItem(CART_KEY);
      if (rawCart) {
        const parsed = JSON.parse(rawCart) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed);
      }
      const rawPromo = window.localStorage.getItem(PROMO_KEY);
      if (rawPromo) {
        try {
          const parsed = JSON.parse(rawPromo) as Promo;
          if (parsed && typeof parsed.code === "string" && parsed.discountCents > 0) {
            setPromo(parsed);
            setPromoStatus("applied");
          }
        } catch {
          /* ignore */
        }
      }
      const rawCurrency = window.localStorage.getItem(CURRENCY_KEY);
      if (rawCurrency && /^[A-Z]{3}$/.test(rawCurrency)) {
        setCurrencyState(rawCurrency as CurrencyCode);
      }
      /* Light is the storefront default. Only an explicitly saved choice — or an
         explicit toggle — switches to dark. */
      const storedTheme = window.localStorage.getItem(THEME_KEY);
      const nextTheme: Theme = storedTheme === "dark" ? "dark" : "light";
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* storage full or unavailable */
    }
  }, [lines, hydrated]);

  /* Session first — the wishlist and checkout gating both depend on it. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/customer/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { authenticated?: boolean; customer?: SessionCustomer | null } | null) => {
        if (cancelled) return;
        setCustomer(payload?.authenticated ? (payload.customer ?? null) : null);
        setSessionReady(true);
      })
      .catch(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Wishlist lives on the account, so it is loaded once the store mounts. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/customer/favourites")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { ids?: number[] } | null) => {
        if (cancelled) return;
        setFavourites(Array.isArray(payload?.ids) ? payload!.ids! : []);
        setFavouritesReady(true);
      })
      .catch(() => {
        if (!cancelled) setFavouritesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavourite = useCallback(async (productId: number) => {
    try {
      const response = await fetch("/api/customer/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (response.status === 401) {
        setFavourites((current) => current.filter((id) => id !== productId));
        return "auth" as const;
      }

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; saved?: boolean }
        | null;

      if (!response.ok || !payload?.ok) return "auth" as const;

      setFavourites((current) =>
        payload.saved
          ? [...current, productId]
          : current.filter((id) => id !== productId),
      );
      return payload.saved ? ("saved" as const) : ("removed" as const);
    } catch {
      return "auth" as const;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PROMO_KEY, promo ? JSON.stringify(promo) : "");
    } catch {
      /* ignore */
    }
  }, [promo, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CURRENCY_KEY, currency);
    } catch {
      /* ignore */
    }
  }, [currency, hydrated]);

  useEffect(() => {
    const locked = isOpen;
    if (locked === scrollLockRef.current) return;
    scrollLockRef.current = locked;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const addItem = useCallback((item: AddToCartInput) => {
    setLines((current) => {
      const key = lineKey(item.slug, item.size, item.color);
      const existing = current.find((line) => line.key === key);
      const step = item.quantity ?? 1;
      if (existing) {
        return current.map((line) =>
          line.key === key
            ? {
                ...line,
                quantity: Math.min(line.maxQuantity, line.quantity + step),
              }
            : line,
        );
      }
      return [...current, { ...item, key, quantity: Math.min(item.maxQuantity, step) }];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      current.flatMap((line) => {
        if (line.key !== key) return [line];
        const next = Math.min(line.maxQuantity, Math.max(0, quantity));
        return next <= 0 ? [] : [{ ...line, quantity: next }];
      }),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const clearPromo = useCallback(() => {
    setPromo(null);
    setPromoError(null);
    setPromoStatus("idle");
  }, []);

  const applyPromo = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return false;
      setPromoStatus("checking");
      setPromoError(null);
      try {
        const response = await fetch("/api/discounts/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            items: lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
          }),
        });
        const payload = (await response.json()) as
          | { ok: true; code: string; label: string; summary: string; discountCents: number }
          | { ok: false; reason: string };

        if (!payload.ok) {
          setPromo(null);
          setPromoError(payload.reason);
          setPromoStatus("error");
          return false;
        }

        setPromo({
          code: payload.code,
          label: payload.label,
          summary: payload.summary,
          discountCents: payload.discountCents,
        });
        setPromoStatus("applied");
        return true;
      } catch {
        setPromo(null);
        setPromoError("Could not check that code right now.");
        setPromoStatus("error");
        return false;
      }
    },
    [lines],
  );

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current: Theme) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(() => {
    const subtotalCents = lines.reduce((total, line) => total + line.priceCents * line.quantity, 0);
  const discountCents = promo ? Math.min(promo.discountCents, subtotalCents) : 0;
    const shippingCents =
      lines.length === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : 1800;
    return {
      lines,
      itemCount: lines.reduce((total, line) => total + line.quantity, 0),
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents: Math.max(0, subtotalCents - discountCents) + shippingCents,
      currency,
      theme,
      customer,
      sessionReady,
      favourites,
      favouritesReady,
      toggleFavourite,
      promo,
      promoStatus,
      promoError,
      applyPromo,
      clearPromo,
      isOpen,
      hydrated,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeLine,
      clearCart,
      setCurrency: (code: CurrencyCode) => setCurrencyState(code),
      setTheme,
      toggleTheme,
      price: (cents: number) => formatMoney(cents, currency),
    };
  }, [
    lines,
    currency,
    theme,
    customer,
    sessionReady,
    favourites,
    favouritesReady,
    toggleFavourite,
    promo,
    promoStatus,
    promoError,
    applyPromo,
    clearPromo,
    isOpen,
    hydrated,
    addItem,
    setQuantity,
    removeLine,
    clearCart,
    setTheme,
    toggleTheme,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside <StoreProvider>");
  return context;
}
