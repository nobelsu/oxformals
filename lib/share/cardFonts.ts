/**
 * Fonts for the share-card images. next/og needs raw ttf data, so fetch the
 * Google Fonts files once per server process. Without a browser User-Agent,
 * the Google Fonts CSS API serves truetype URLs.
 */
type CardFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Schoolbell&family=Space+Grotesk:wght@400;700&display=swap";

let fontsPromise: Promise<CardFont[]> | null = null;

async function load(): Promise<CardFont[]> {
  const css = await (await fetch(CSS_URL)).text();
  const blocks = css.split("@font-face").slice(1);
  const fonts: CardFont[] = [];
  for (const block of blocks) {
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1] ?? 400);
    const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
    if (!family || !url || (weight !== 400 && weight !== 700)) continue;
    const data = await (await fetch(url)).arrayBuffer();
    fonts.push({ name: family, data, weight, style: "normal" });
  }
  if (fonts.length === 0) throw new Error("Could not load share-card fonts");
  return fonts;
}

export function loadCardFonts(): Promise<CardFont[]> {
  fontsPromise ??= load().catch((e) => {
    fontsPromise = null;
    throw e;
  });
  return fontsPromise;
}
