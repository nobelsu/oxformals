import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Share-card routes read their fonts from disk (lib/share/cardFonts.ts).
  outputFileTracingIncludes: {
    "/api/share/**/*": ["./lib/share/fonts/**/*"],
  },
  // The push service worker must never be cached, so updates reach browsers.
  // The iOS app-link file has no extension, so it needs its type set by hand.
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
