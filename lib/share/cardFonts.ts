import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for the share-card images, read from lib/share/fonts (self-hosted so
 * no request goes to Google). next/og needs ttf/otf/woff, not woff2, so these
 * are the static truetype cuts. Loaded once per server process.
 */
type CardFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

const FONTS: { name: string; file: string; weight: 400 | 700 }[] = [
  { name: "Schoolbell", file: "Schoolbell-Regular.ttf", weight: 400 },
  { name: "Space Grotesk", file: "SpaceGrotesk-Regular.ttf", weight: 400 },
  { name: "Space Grotesk", file: "SpaceGrotesk-Bold.ttf", weight: 700 },
];

let fontsPromise: Promise<CardFont[]> | null = null;

async function load(): Promise<CardFont[]> {
  return await Promise.all(
    FONTS.map(async ({ name, file, weight }) => ({
      name,
      // process.cwd() is the project root (see next.config outputFileTracingIncludes).
      data: await readFile(join(process.cwd(), "lib/share/fonts", file)),
      weight,
      style: "normal" as const,
    })),
  );
}

export function loadCardFonts(): Promise<CardFont[]> {
  fontsPromise ??= load().catch((e) => {
    fontsPromise = null;
    throw e;
  });
  return fontsPromise;
}
