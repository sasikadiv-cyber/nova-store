"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

import { FREE_SHIPPING_THRESHOLD, useStore } from "./store-provider";
import { Price } from "./ui";

export function CartDrawer() {
  const {
    lines,
    itemCount,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    promo,
    promoStatus,
    promoError,
    applyPromo,
    clearPromo,
    customer,
    isOpen,
    closeCart,
    setQuantity,
    removeLine,
  } = useStore();

  /* Orders require an account, so signed-out clients are sent to sign in —
     the bag is preserved and they return to checkout afterwards. */
  const checkoutHref = customer ? "/checkout" : "/account/login?next=/checkout";

  const [codeInput, setCodeInput] = useState("");

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalCents);
  const progress = Math.min(100, (subtotalCents / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[120] ${isOpen ? "" : "pointer-events-none"}`}
    >
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-scrim/45 backdrop-blur-[3px] transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Shopping bag"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-bone shadow-[0_0_80px_rgba(11,11,12,0.28)] transition-transform duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <div>
            <p className="eyebrow text-ink-300">Your bag</p>
            <h2 className="mt-1 text-2xl">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 transition-colors hover:bg-ink hover:text-bone"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </header>

        {lines.length > 0 && (
          <div className="border-b border-ink/10 px-6 py-4">
            <p className="text-[12.5px] text-ink-500">
              {remaining === 0 ? (
                <>Complimentary global shipping unlocked ✦</>
              ) : (
                <>
                  You&apos;re <Price cents={remaining} className="font-medium" /> away from free global
                  shipping
                </>
              )}
            </p>
            <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-brass transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full border border-ink/12">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 8h12l-1 12H7L6 8zM9 8a3 3 0 0 1 6 0" />
              </svg>
            </div>
            <div>
              <p className="text-xl">Your bag is empty</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                Pieces you add are saved to this device, so you can pick up where you left off.
              </p>
            </div>
            <Link
              href="/shop"
              onClick={closeCart}
              className="mt-2 bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:bg-ink-700"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="hide-scrollbar flex-1 overflow-y-auto px-6 py-5">
            <ul className="flex flex-col divide-y divide-ink/8">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-4 py-5 first:pt-0">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={closeCart}
                    className="relative h-[116px] w-[88px] shrink-0 overflow-hidden bg-bone-dark"
                  >
                    <Image src={line.image} alt={line.name} fill sizes="88px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px]">{line.name}</p>
                        <p className="mt-1 text-[11.5px] uppercase tracking-[0.12em] text-ink-300">
                          {line.color}
                          {line.size ? ` · ${line.size}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-[14.5px]">
                        <Price cents={line.priceCents * line.quantity} />
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-ink/15">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key, line.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="grid h-8 w-8 place-items-center transition-colors hover:bg-ink/5"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-[13px] tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={line.quantity >= line.maxQuantity}
                          className="grid h-8 w-8 place-items-center transition-colors hover:bg-ink/5 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="link-underline text-[11.5px] uppercase tracking-[0.14em] text-ink-300 hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[11.5px] leading-relaxed text-ink-300">
              Duties and taxes are included for all destinations. Complimentary returns within 30 days.
            </p>
          </div>
        )}

        {lines.length > 0 && (
          <footer className="border-t border-ink/10 bg-bone px-6 py-5">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await applyPromo(codeInput);
                if (ok) setCodeInput("");
              }}
              className="mb-5"
            >
              {promo ? (
                <div className="flex items-center justify-between gap-3 border border-brass/45 bg-brass/10 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[12.5px] tracking-[0.08em]">{promo.code}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-300">{promo.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPromo}
                    className="link-underline shrink-0 text-[11px] uppercase tracking-[0.14em] text-ink-300"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border border-ink/15 px-3 py-2.5 transition-colors focus-within:border-ink">
                    <input
                      value={codeInput}
                      onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                      placeholder="Promotional code"
                      aria-label="Promotional code"
                      className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] uppercase tracking-[0.08em] outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-300"
                    />
                    <button
                      type="submit"
                      disabled={promoStatus === "checking" || !codeInput.trim()}
                      className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] transition-opacity hover:opacity-60 disabled:opacity-40"
                    >
                      {promoStatus === "checking" ? "Checking" : "Apply"}
                    </button>
                  </div>
                  {promoError && <p className="mt-2 text-[12px] text-ember">{promoError}</p>}
                </>
              )}
            </form>

            <dl className="space-y-2 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-ink-300">Subtotal</dt>
                <dd>
                  <Price cents={subtotalCents} />
                </dd>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-brass">
                  <dt>Discount</dt>
                  <dd>
                    −<Price cents={discountCents} />
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-300">Shipping</dt>
                <dd>{shippingCents === 0 ? "Complimentary" : <Price cents={shippingCents} />}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-ink/10 pt-3 text-base">
                <dt>Total</dt>
                <dd className="text-xl">
                  <Price cents={totalCents} />
                </dd>
              </div>
            </dl>
            <Link
              href={checkoutHref}
              onClick={closeCart}
              className="mt-4 block w-full bg-ink py-4 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-bone transition-colors hover:bg-ink-700"
            >
              {customer ? "Checkout" : "Sign in to check out"}
            </Link>
            {!customer && (
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-300">
                An account is required to place an order — your bag is saved on this device.
              </p>
            )}
            <button
              type="button"
              onClick={closeCart}
              className="link-underline mx-auto mt-3 block text-[12px] text-ink-300"
            >
              Continue shopping
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
