import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
