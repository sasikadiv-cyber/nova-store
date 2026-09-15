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
