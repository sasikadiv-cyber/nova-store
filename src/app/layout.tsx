import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart-drawer";
import { SiteFooter } from "@/components/site-footer";
import { PromoPopup } from "@/components/promo-popup";
import { QuickViewProvider } from "@/components/quick-view";
import { getAppearance } from "@/lib/site-settings";
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/apple-icon.png", type: "image/png", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "48x48" }],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const appearance = await getAppearance();
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/* Applies the stored theme before first paint so there is no flash.
            data-theme is never managed by React, so hydration stays clean. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('nova.theme')==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})();",
          }}
        />
        <meta name="theme-color" content="#f7f4ef" />
      </head>
      <body className="bg-bone text-ink antialiased">
        <StoreProvider>
          <QuickViewProvider>
            <SiteHeader
              nav={{
                home: appearance.nav_home,
                collections: appearance.nav_collections,
                footwear: appearance.nav_footwear,
                outerwear: appearance.nav_outerwear,
                shopAll: appearance.nav_shop_all,
                myAccount: appearance.nav_my_account,
              }}
              announcement={{
                enabled: appearance.announcement_enabled === "true",
                text: appearance.announcement_text,
                linkLabel: appearance.announcement_link_label,
                linkHref: appearance.announcement_link_href,
              }}
            />
            <main className="min-h-[60vh]">{children}</main>
            <SiteFooter />
            <CartDrawer />

            {appearance.popup_enabled === "true" && (
              <PromoPopup
                content={{
                  eyebrow: appearance.popup_eyebrow,
                  title: appearance.popup_title,
                  body: appearance.popup_body,
                  code: appearance.popup_code,
                  ctaLabel: appearance.popup_cta_label,
                  ctaHref: appearance.popup_cta_href,
                  image: appearance.popup_image,
                  delay: appearance.popup_delay,
                }}
              />
            )}
          </QuickViewProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
