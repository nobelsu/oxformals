/**
 * Renders the images the transactional emails use (email clients can't load
 * our fonts or inline SVG reliably, so everything hand-drawn ships as PNG):
 *
 *   public/email/logo.png          Schoolbell wordmark
 *   public/email/squiggle.png      accent wave under the wordmark
 *   public/email/crest/<slug>.png  each college's crest (lib/data/crests.tsx)
 *   public/email/name/<slug>.png   each college's name in Schoolbell
 *   convex/emailAssets.ts          which slugs have a crest, and name widths
 *
 * Everything is drawn at 2x with a transparent background by headless
 * Chrome, then cropped and palette-compressed with sharp.
 *
 * Run: node scripts/email-assets/run.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { OXFORD_COLLEGES } from "../../lib/data/colleges";
import { collegeToSlug } from "../../lib/data/collegeSlug";
import { CRESTS, TINCTURES } from "../../lib/data/crests";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ROOT = process.cwd();
const OUT = join(ROOT, "public/email");
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCALE = 2;
const INK = "#1b1a12";
const ACCENT = "#b8524c";

/** Display sizes (CSS px); the PNGs are SCALE times bigger. */
export const LOGO = { width: 200, height: 36 };
export const SQUIGGLE = { width: 84, height: 10 };
export const CREST = { width: 48, height: 51 };
export const NAME_HEIGHT = 25;

const SHIELD_PATH = "M6 4h48v26c0 16-12 25-24 30C18 55 6 46 6 30z";

const fontB64 = readFileSync(join(ROOT, "app/fonts/Schoolbell-latin.woff2")).toString("base64");
const FONT_FACE = `@font-face{font-family:S;src:url(data:font/woff2;base64,${fontB64}) format("woff2")}`;

function page(css: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_FACE}html,body{margin:0;padding:0;background:transparent;overflow:hidden}${css}</style></head><body>${body}</body></html>`;
}

const work = mkdtempSync(join(tmpdir(), "email-assets-"));
let counter = 0;

/** Screenshot an HTML page at SCALE with a transparent background. */
async function shoot(html: string, width: number, height: number): Promise<Buffer> {
  const id = counter++;
  const src = join(work, `${id}.html`);
  const png = join(work, `${id}.png`);
  writeFileSync(src, html);
  // Headless Chrome writes the screenshot but doesn't always exit, so wait
  // for the file to settle and then stop it ourselves.
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${join(work, `profile-${id}`)}`,
      `--force-device-scale-factor=${SCALE}`,
      "--default-background-color=00000000",
      "--virtual-time-budget=2000",
      `--window-size=${width},${height}`,
      `--screenshot=${png}`,
      `file://${src}`,
    ],
    { detached: true, stdio: "ignore" },
  );
  let exited = false;
  chrome.on("exit", () => (exited = true));
  let lastSize = -1;
  for (let i = 0; i < 300; i++) {
    await sleep(100);
    if (existsSync(png)) {
      const size = statSync(png).size;
      if (size > 0 && size === lastSize) break;
      lastSize = size;
    }
  }
  if (!exited && chrome.pid) {
    try {
      process.kill(-chrome.pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
  if (!existsSync(png)) throw new Error(`Chrome produced no screenshot for ${src}`);
  const shot = readFileSync(png);
  // Chrome may add rows below the viewport; keep exactly the requested box.
  return sharp(shot)
    .extract({ left: 0, top: 0, width: width * SCALE, height: height * SCALE })
    .png()
    .toBuffer();
}

async function save(buf: Buffer, file: string): Promise<void> {
  await sharp(buf)
    .png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 })
    .toFile(file);
}

/** Crop to the ink's horizontal extent (full height kept, so names line up). */
async function cropX(buf: Buffer): Promise<{ buf: Buffer; width: number }> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let min = info.width;
  let max = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
  }
  // Pad to an even number of pixels so the 1x width is a whole number.
  let left = Math.max(0, min - 2);
  let right = Math.min(info.width - 1, max + 2);
  if ((right - left + 1) % 2 === 1) right = Math.min(info.width - 1, right + 1);
  if ((right - left + 1) % 2 === 1) left = Math.max(0, left - 1);
  const width = right - left + 1;
  const out = await sharp(buf).extract({ left, top: 0, width, height: info.height }).png().toBuffer();
  return { buf: out, width: width / SCALE };
}

function crestSvg(college: string): string {
  const crest = CRESTS[college];
  return renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 64" width={CREST.width} height={CREST.height} style={{ display: "block" }}>
      <defs>
        <clipPath id="c">
          <path d={SHIELD_PATH} />
        </clipPath>
      </defs>
      <g clipPath="url(#c)">
        <rect width="60" height="64" fill={crest.field} />
        {crest.art}
      </g>
      <path d={SHIELD_PATH} fill="none" stroke={TINCTURES.ink} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>,
  );
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
    }),
  );
}

async function main() {
  mkdirSync(join(OUT, "crest"), { recursive: true });
  mkdirSync(join(OUT, "name"), { recursive: true });

  await save(
    await shoot(
      page(
        `div{font-family:S;font-size:24.3px;letter-spacing:.12em;text-transform:uppercase;color:${INK};width:${LOGO.width}px;height:${LOGO.height}px;display:flex;align-items:center;justify-content:center}`,
        "<div>Oxformals</div>",
      ),
      LOGO.width,
      LOGO.height,
    ),
    join(OUT, "logo.png"),
  );

  await save(
    await shoot(
      page(
        "svg{display:block}",
        `<svg width="${SQUIGGLE.width}" height="${SQUIGGLE.height}" viewBox="0 0 120 14"><path d="M3 9 C 13 1, 23 13, 33 7 S 53 1, 63 7 S 83 13, 93 7 S 110 3, 117 6" fill="none" stroke="${ACCENT}" stroke-width="3.2" stroke-linecap="round"/></svg>`,
      ),
      SQUIGGLE.width,
      SQUIGGLE.height,
    ),
    join(OUT, "squiggle.png"),
  );

  const colleges = [...new Set<string>([...OXFORD_COLLEGES, ...Object.keys(CRESTS)])].sort();
  const assets: Record<string, { crest: boolean; nameWidth: number }> = {};

  await pool(colleges, 6, async (college) => {
    const slug = collegeToSlug(college);
    const hasCrest = college in CRESTS;
    if (hasCrest) {
      await save(await shoot(page("", crestSvg(college)), CREST.width, CREST.height), join(OUT, "crest", `${slug}.png`));
    }
    const name = await cropX(
      await shoot(
        page(
          `div{font-family:S;font-size:20px;line-height:${NAME_HEIGHT}px;letter-spacing:.04em;text-transform:uppercase;color:${INK};white-space:nowrap;padding-left:4px}`,
          `<div>${college.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`,
        ),
        400,
        NAME_HEIGHT,
      ),
    );
    await save(name.buf, join(OUT, "name", `${slug}.png`));
    assets[slug] = { crest: hasCrest, nameWidth: name.width };
    console.log(`${college}: crest=${hasCrest} name=${name.width}px`);
  });

  const sorted = Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    join(ROOT, "convex/emailAssets.ts"),
    `// Generated by scripts/email-assets/build.tsx. Do not edit by hand.
// Images live in public/email/; sizes are display pixels (the PNGs are ${SCALE}x).

export const EMAIL_LOGO = ${JSON.stringify(LOGO)} as const;
export const EMAIL_SQUIGGLE = ${JSON.stringify(SQUIGGLE)} as const;
export const EMAIL_CREST = ${JSON.stringify(CREST)} as const;
export const EMAIL_NAME_HEIGHT = ${NAME_HEIGHT};

/** Per college slug: whether a crest PNG exists, and the name PNG's width. */
export const EMAIL_COLLEGE_ASSETS: Record<string, { crest: boolean; nameWidth: number }> = ${JSON.stringify(sorted, null, 2)};
`,
  );
  rmSync(work, { recursive: true, force: true });
}

await main();
