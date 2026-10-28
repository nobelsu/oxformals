import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { CardRead } from "./cardRules";

const DEFAULT_MODEL = "claude-opus-5-5";
/** Image types Claude accepts; anything else goes to an admin. */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const PROMPT = `You check photos of University of Oxford student cards ("University Card", issued by the Bodleian, showing a photo, name, college and an expiry date).
Read the photo and report:
- isOxfordUniversityCard: true only if this is clearly a University of Oxford University Card (not another university, not a library or college card, not a screenshot of a document).
- name: the cardholder's name exactly as printed, or null if unreadable.
- college: the college or hall as printed, or null.
- expiry: the expiry or "valid until" date as YYYY-MM-DD, or null.
- isPhotoOfPhysicalCard: true only if this is a camera photo of a real plastic card (visible edges, lighting, perspective, texture). False for screenshots, scans of documents, digitally drawn or generated images, or a card shown on a screen.
- hasPortraitPhoto: true only if the card shows a real photograph of a person's face (not a placeholder, blank box or drawing).
- confidence: "high" only if all of the above is clear and the card shows the genuine University of Oxford design (crest and layout) with no sign of editing; otherwise "medium" or "low".
Be sceptical: people may try to pass off made-up cards.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isOxfordUniversityCard",
    "name",
    "college",
    "expiry",
    "isPhotoOfPhysicalCard",
    "hasPortraitPhoto",
    "confidence",
  ],
  properties: {
    isOxfordUniversityCard: { type: "boolean" },
    name: { anyOf: [{ type: "string" }, { type: "null" }] },
    college: { anyOf: [{ type: "string" }, { type: "null" }] },
    expiry: { anyOf: [{ type: "string" }, { type: "null" }] },
    isPhotoOfPhysicalCard: { type: "boolean" },
    hasPortraitPhoto: { type: "boolean" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function parseRead(raw: unknown): CardRead | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
  const confidence = r.confidence;
  if (typeof r.isOxfordUniversityCard !== "boolean") return null;
  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") return null;
  const expiry = str(r.expiry);
  return {
    isOxfordUniversityCard: r.isOxfordUniversityCard,
    name: str(r.name),
    college: str(r.college),
    expiry: expiry && /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
    confidence,
    isPhotoOfPhysicalCard: r.isPhotoOfPhysicalCard === true,
    hasPortraitPhoto: r.hasPortraitPhoto === true,
  };
}

/**
 * Reads a card photo with Claude and hands the result to cardChecks.applyRead.
 * Any failure (no key, network, refusal, odd reply) passes null, which sends
 * the card to an admin rather than failing the person.
 */
export const readCard = internalAction({
  args: { checkId: v.id("cardChecks") },
  returns: v.null(),
  handler: async (ctx, { checkId }) => {
    const target = await ctx.runQuery(internal.cardChecks.getForReading, { checkId });
    if (!target) return null;

    let read: CardRead | null = null;
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const blob = await ctx.storage.get(target.imageId);
      const type = (blob?.type || "image/jpeg") as ImageType;
      if (!apiKey) {
        console.error("readCard: ANTHROPIC_API_KEY is not set");
      } else if (!blob) {
        console.error("readCard: photo is missing", checkId);
      } else if (!IMAGE_TYPES.includes(type)) {
        console.error("readCard: unsupported image type", type);
      } else {
        const data = toBase64(new Uint8Array(await blob.arrayBuffer()));
        const client = new Anthropic({ apiKey });
        const response = await client.beta.messages.create({
          model: process.env.CARD_CHECK_MODEL || DEFAULT_MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: PROMPT,
          messages: [
            {
              role: "user",
              content: [{ type: "image", source: { type: "base64", media_type: type, data } }],
            },
          ],
          output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
        });
        if (response.stop_reason === "refusal") {
          console.error("readCard: refused", response.stop_details);
        } else {
          const text = response.content.find((b) => b.type === "text");
          read = text?.type === "text" ? parseRead(JSON.parse(text.text)) : null;
        }
      }
    } catch (e) {
      console.error("readCard: failed", e);
      read = null;
    }

    await ctx.runMutation(internal.cardChecks.applyRead, { checkId, read });
    return null;
  },
});
