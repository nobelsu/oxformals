import { v } from "convex/values";

/** Canonical UI font / theme keys (stored on `users.uiFont`). */
export const UI_FONT_IDS = [
  "schoolbell",
  "inter",
  "dm_sans",
  "lora",
  "georgia",
  "arial",
  "system_ui",
] as const;

export type UiFontId = (typeof UI_FONT_IDS)[number];

export const DEFAULT_UI_FONT: UiFontId = "schoolbell";

export const uiFontValidator = v.union(
  v.literal("schoolbell"),
  v.literal("inter"),
  v.literal("dm_sans"),
  v.literal("lora"),
  v.literal("georgia"),
  v.literal("arial"),
  v.literal("system_ui"),
);

export const UI_FONT_OPTIONS: { id: UiFontId; label: string }[] = [
  { id: "schoolbell", label: "Warm paper" },
  { id: "inter", label: "Cool slate" },
  { id: "dm_sans", label: "Soft rose" },
  { id: "lora", label: "Library" },
  { id: "georgia", label: "Newsprint" },
  { id: "arial", label: "Clean white" },
  { id: "system_ui", label: "Mint" },
];

/** Map legacy experiment ids (or unknown) to a canonical `UiFontId`. */
export function migrateUiFontValue(raw: unknown): UiFontId {
  switch (raw) {
    case "schoolbell":
    case "inter":
    case "dm_sans":
    case "lora":
    case "georgia":
    case "arial":
    case "system_ui":
      return raw;
    case "default":
    case "comic_sans":
      return "schoolbell";
    case "helvetica":
      return "inter";
    case "garamond":
      return "lora";
    case "futura":
      return "dm_sans";
    default:
      return "schoolbell";
  }
}
