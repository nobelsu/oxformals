/**
 * Where a tour callout goes next to the thing it points at. Pure so it can be
 * tested without a browser.
 *
 * - Below the target when it fits, else above; if neither fits, the side with
 *   more room. It never overlaps the target.
 * - Horizontally centred on the target, then clamped inside the viewport.
 * - Narrower than asked on screens too small for it.
 * - `tailX` (from the callout's left edge) follows the target's centre, kept
 *   clear of the rounded corners.
 */

export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };

export type CalloutPlacement = {
  top: number;
  left: number;
  width: number;
  /** Tail position, measured from the callout's left edge. */
  tailX: number;
  /** Which side of the target the callout sits on. */
  side: "below" | "above";
};

export type CalloutOptions = {
  /** Space between target and callout (the tail sits in it). */
  gap?: number;
  /** Minimum distance from the viewport edges. */
  margin?: number;
  /** How close the tail may get to the callout's left/right edge. */
  tailInset?: number;
};

export function placeCallout(
  target: Box,
  callout: Size,
  viewport: Size,
  { gap = 14, margin = 12, tailInset = 22 }: CalloutOptions = {},
): CalloutPlacement {
  const width = Math.max(0, Math.min(callout.width, viewport.width - margin * 2));
  const targetBottom = target.top + target.height;

  const roomBelow = viewport.height - margin - (targetBottom + gap);
  const roomAbove = target.top - gap - margin;
  const side: CalloutPlacement["side"] =
    roomBelow >= callout.height || roomBelow >= roomAbove ? "below" : "above";
  const top =
    side === "below" ? targetBottom + gap : target.top - gap - callout.height;

  const centreX = target.left + target.width / 2;
  const maxLeft = Math.max(margin, viewport.width - margin - width);
  const left = clamp(centreX - width / 2, margin, maxLeft);

  const tailX = clamp(
    centreX - left,
    Math.min(tailInset, width / 2),
    Math.max(width - tailInset, width / 2),
  );

  return { top, left, width, tailX, side };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
