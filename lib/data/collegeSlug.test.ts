import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collegeToSlug, slugToCollege } from "./collegeSlug";

describe("collegeSlug", () => {
  it("round-trips Queen's", () => {
    const slug = collegeToSlug("Queen's");
    assert.equal(slug, "queens");
    assert.equal(slugToCollege(slug), "Queen's");
  });

  it("round-trips St Edmund Hall", () => {
    const slug = collegeToSlug("St Edmund Hall");
    assert.equal(slug, "st-edmund-hall");
    assert.equal(slugToCollege(slug), "St Edmund Hall");
  });

  it("round-trips Christ Church", () => {
    const slug = collegeToSlug("Christ Church");
    assert.equal(slugToCollege(slug), "Christ Church");
  });

  it("returns null for unknown slug", () => {
    assert.equal(slugToCollege("not-a-college"), null);
  });
});
