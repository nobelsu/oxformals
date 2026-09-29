import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { placeCallout, type Box, type CalloutPlacement } from "./calloutPlacement";

const PHONE = { width: 375, height: 700 };
const CALLOUT = { width: 260, height: 120 };

function overlaps(target: Box, p: CalloutPlacement, height: number): boolean {
  return !(
    p.left + p.width <= target.left ||
    p.left >= target.left + target.width ||
    p.top + height <= target.top ||
    p.top >= target.top + target.height
  );
}

describe("placeCallout", () => {
  it("sits below a target near the top, centred on it", () => {
    const target = { top: 100, left: 150, width: 80, height: 36 };
    const p = placeCallout(target, CALLOUT, PHONE);
    assert.equal(p.side, "below");
    assert.equal(p.top, 150);
    assert.equal(p.left, 190 - 130);
    assert.equal(p.tailX, 130);
    assert.equal(overlaps(target, p, CALLOUT.height), false);
  });

  it("clamps to the left margin and moves the tail to the target", () => {
    const target = { top: 8, left: 4, width: 40, height: 40 };
    const p = placeCallout(target, CALLOUT, PHONE);
    assert.equal(p.left, 12);
    // Target centre is x=24, 12px into the callout; the tail stays off the corner.
    assert.equal(p.tailX, 22);
    assert.equal(overlaps(target, p, CALLOUT.height), false);
  });

  it("clamps to the right margin", () => {
    const target = { top: 8, left: 300, width: 40, height: 40 };
    const p = placeCallout(target, CALLOUT, PHONE);
    assert.equal(p.left, 375 - 12 - 260);
    assert.equal(p.tailX, 320 - p.left);
    assert.ok(p.left + p.width <= PHONE.width - 12);
  });

  it("goes above a target near the bottom", () => {
    const target = { top: 620, left: 100, width: 100, height: 40 };
    const p = placeCallout(target, CALLOUT, PHONE);
    assert.equal(p.side, "above");
    assert.equal(p.top, 620 - 14 - 120);
    assert.equal(overlaps(target, p, CALLOUT.height), false);
  });

  it("shrinks on tiny screens and stays inside", () => {
    const tiny = { width: 240, height: 400 };
    const target = { top: 10, left: 200, width: 30, height: 30 };
    const p = placeCallout(target, CALLOUT, tiny);
    assert.equal(p.width, 216);
    assert.equal(p.left, 12);
    assert.ok(p.tailX <= p.width - 22);
    assert.equal(overlaps(target, p, CALLOUT.height), false);
  });

  it("picks the roomier side when neither fits, without overlapping", () => {
    const short = { width: 375, height: 200 };
    const target = { top: 120, left: 100, width: 80, height: 40 };
    const p = placeCallout(target, CALLOUT, short);
    assert.equal(p.side, "above");
    assert.equal(overlaps(target, p, CALLOUT.height), false);
  });

  it("never overlaps across a sweep of positions", () => {
    for (let y = 0; y <= 660; y += 20) {
      for (let x = 0; x <= 335; x += 15) {
        const target = { top: y, left: x, width: 40, height: 40 };
        const p = placeCallout(target, CALLOUT, PHONE);
        assert.equal(overlaps(target, p, CALLOUT.height), false, `${x},${y}`);
        assert.ok(p.left >= 12 && p.left + p.width <= PHONE.width - 12);
        assert.ok(p.tailX >= 0 && p.tailX <= p.width);
      }
    }
  });
});
