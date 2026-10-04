import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Share-card routes read their fonts from disk (lib/share/cardFonts.ts).
  outputFileTracingIncludes: {
    "/api/share/**/*": ["./lib/share/fonts/**/*"],
  },
  // The push service worker must never be cached, so updates reach browsers.
  async headers() {
    return [
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
