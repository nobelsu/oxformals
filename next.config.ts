import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Share-card routes read their fonts from disk (lib/share/cardFonts.ts).
  outputFileTracingIncludes: {
    "/api/share/**/*": ["./lib/share/fonts/**/*"],
  },
};

export default nextConfig;
