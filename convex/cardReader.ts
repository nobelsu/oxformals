import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { CardRead } from "./cardRules";

const DEFAULT_MODEL = "gpt-4.1-mini";

const PROMPT = `You check photos of University of Oxford student cards ("University Card", issued by the Bodleian, showing a photo, name, college and an expiry date).
Read the photo and report:
- isOxfordUniversityCard: true only if this is clearly a University of Oxford University Card (not another university, not a library or college card, not a screenshot of a document).
- name: the cardholder's name exactly as printed, or null if unreadable.
- college: the college or hall as printed, or null.
- expiry: the expiry or "valid until" date as YYYY-MM-DD, or null.
- confidence: "high" only if the card is fully visible, sharp, unobstructed and shows no sign of editing; otherwise "medium" or "low".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isOxfordUniversityCard", "name", "college", "expiry", "confidence"],
  properties: {
    isOxfordUniversityCard: { type: "boolean" },
    name: { type: ["string", "null"] },
    college: { type: ["string", "null"] },
    expiry: { type: ["string", "null"] },
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
  };
}

/**
 * Reads a card photo with OpenAI and hands the result to cardChecks.applyRead.
 * Any failure (no key, network, odd reply) passes null, which sends the card
 * to an admin rather than failing the person.
 */
export const readCard = internalAction({
  args: { checkId: v.id("cardChecks") },
  returns: v.null(),
  handler: async (ctx, { checkId }) => {
    const target = await ctx.runQuery(internal.cardChecks.getForReading, { checkId });
    if (!target) return null;

    let read: CardRead | null = null;
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      const blob = await ctx.storage.get(target.imageId);
      if (!apiKey) {
        console.error("readCard: OPENAI_API_KEY is not set");
      } else if (!blob) {
        console.error("readCard: photo is missing", checkId);
      } else {
        const type = blob.type || "image/jpeg";
        const data = toBase64(new Uint8Array(await blob.arrayBuffer()));
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: process.env.CARD_CHECK_MODEL || DEFAULT_MODEL,
            messages: [
              { role: "system", content: PROMPT },
              {
                role: "user",
                content: [{ type: "image_url", image_url: { url: `data:${type};base64,${data}` } }],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "card_read", strict: true, schema: SCHEMA },
            },
          }),
        });
        if (!res.ok) {
          console.error("readCard: OpenAI responded", res.status, await res.text());
        } else {
          const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const content = body.choices?.[0]?.message?.content;
          read = content ? parseRead(JSON.parse(content)) : null;
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
