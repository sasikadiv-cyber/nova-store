import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart-drawer";
import { SiteFooter } from "@/components/site-footer";
import { QuickViewProvider } from "@/components/quick-view";
import { SiteHeader } from "@/components/site-header";
import { StoreProvider } from "@/components/store-provider";
import "./globals.css";

/* Self-hosted at build time so the wordmark and headings always render,
   with no runtime request to a third-party font CDN. */
/* Cormorant Garamond — a refined, quietly luxurious Garamond cut used for
   the wordmark and editorial headlines. Body and UI copy stay on Inter. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Nova — Considered clothing & footwear, shipped worldwide",
    template: "%s · Nova",
  },
  description:
    "Nova makes considered clothing and footwear in small runs with mills in Biella, Okayama and Porto. Cashmere knits, sculpted outerwear and hand-finished shoes, delivered to 94 countries.",
  keywords: [
    "luxury clothing",
    "cashmere",
    "designer footwear",
    "global shipping",
    "premium essentials",
    "Nova",
  ],
  openGraph: {
    title: "Nova — Considered clothing & footwear",
    description: "Small-run cashmere, outerwear and hand-finished shoes, shipped worldwide.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/* Applies the stored theme before first paint so there is no flash.
            data-theme is never managed by React, so hydration stays clean. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('nova.theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})();",
          }}
        />
        <meta name="theme-color" content="#f7f4ef" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#16140f" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="bg-bone text-ink antialiased">
        <StoreProvider>
          <QuickViewProvider>
            <SiteHeader />
            <main className="min-h-[60vh]">{children}</main>
            <SiteFooter />
            <CartDrawer />
          </QuickViewProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
