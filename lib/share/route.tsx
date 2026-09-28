import { ConvexHttpClient } from "convex/browser";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { loadCardFonts } from "./cardFonts";
import { CARD_SIZE } from "./cards";

export function convexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

/** Render a card, or 404 when its data is missing (or the id is invalid). */
export async function renderCard(
  load: () => Promise<ReactElement | null>,
): Promise<Response> {
  let element: ReactElement | null;
  try {
    element = await load();
  } catch {
    element = null;
  }
  if (!element) return new Response("Not found", { status: 404 });
  return new ImageResponse(element, {
    ...CARD_SIZE,
    fonts: await loadCardFonts(),
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
