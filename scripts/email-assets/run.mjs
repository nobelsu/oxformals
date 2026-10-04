// Bundles build.tsx (TSX, imports lib/data) with esbuild and runs it.
// Usage, from the repo root: node scripts/email-assets/run.mjs
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// Inside node_modules so the bundle's bare imports (react, sharp) resolve.
const outDir = join(here, "../../node_modules/.cache/email-assets");
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, "build.mjs");

await build({
  entryPoints: [join(here, "build.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  jsx: "automatic",
  packages: "external",
  outfile,
  logLevel: "warning",
});

await import(pathToFileURL(outfile).href);
