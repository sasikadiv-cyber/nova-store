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
  images: {
    unoptimized: true,
    // Any https host: the shop owner pastes their own image links in the
    // console, so the source cannot be restricted to a fixed allow-list.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
