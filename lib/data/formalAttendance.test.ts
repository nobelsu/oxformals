import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTENDANCE_DECLINE_PRESET_OTHER,
  rowCountsAsAttended,
  validateDeclineReason,
} from "./formalAttendance";

describe("rowCountsAsAttended", () => {
  it("treats missing attended as attended", () => {
    assert.equal(rowCountsAsAttended({}), true);
  });

  it("is false when attended is false", () => {
    assert.equal(rowCountsAsAttended({ attended: false }), false);
  });
});

describe("validateDeclineReason", () => {
  it("accepts a preset", () => {
    const r = validateDeclineReason("Plans changed");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.reasonPreset, "Plans changed");
  });

  it("requires other text for Other", () => {
    const r = validateDeclineReason(ATTENDANCE_DECLINE_PRESET_OTHER);
    assert.equal(r.ok, false);
  });

  it("accepts Other with text", () => {
    const r = validateDeclineReason(ATTENDANCE_DECLINE_PRESET_OTHER, "Train cancelled");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.reasonOther, "Train cancelled");
  });
});
