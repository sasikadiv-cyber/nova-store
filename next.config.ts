import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Never serve a stale dynamic route from the client router cache, so a
  // product created in the console shows up immediately in the shop grid,
  // the admin list and the dashboard counts.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 60,
    },
  },

  poweredByHeader: false,
  compress: true,

  images: {
    // The owner pastes their own image links in the console, so the source
    // cannot be restricted to a fixed allow-list.
    remotePatterns: [{ protocol: "https", hostname: "**" }],

    // Modern formats first: AVIF is roughly half the size of WebP.
    formats: ["image/avif", "image/webp"],

    // Serve the sizes the storefront actually renders, which keeps the
    // generated variants (and the optimizer cache) small.
    deviceSizes: [360, 420, 640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [44, 64, 70, 88, 116, 160, 256, 384],

    // Cached at the edge for a month, so repeat visits and PageSpeed runs
    // do not re-optimise the same photograph.
    minimumCacheTTL: 2_592_000,
  },

  async headers() {
    return [
      {
        // Applies to every response, including HTML.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // payment must stay enabled for us and Stripe's frames —
            // the Payment Element uses the Payment Request API (Apple Pay,
            // Google Pay) and `payment=()` blocks it in the whole document.
            value:
              'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com"), usb=()',
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js needs inline styles for its own critical CSS.
              "style-src 'self' 'unsafe-inline'",
              // Images and films are owner-supplied https links.
              "img-src 'self' data: https: blob:",
              "media-src 'self' https:",
              // next/font injects a small inline script; JSON-LD is inline too.
              // js.stripe.com powers the embedded Payment Element at checkout.
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              // Stripe's hosted iframes (embedded Checkout, Payment Element,
              // 3-D Secure) and web workers used by Stripe.js fraud telemetry.
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // Long-lived caching for hashed build output.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Optimised images are content-addressed by their query string.
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
      {
        // The hero film and its poster never change for a given build.
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000" },
        ],
      },
    ];
  },
};

export default nextConfig;
