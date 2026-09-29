import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OXFORD_COLLEGES } from "./colleges";
import {
  ROLE_OPTIONS,
  formatYearRole,
  roleAfterCollegeChange,
  roleChoices,
  roleNeedsYear,
  rolesForCollege,
} from "./roles";

describe("rolesForCollege", () => {
  it("All Souls only has fellows", () => {
    assert.deepEqual([...rolesForCollege("All Souls")], ["Fellow"]);
  });

  it("graduate colleges offer Masters, DPhil and Fellow", () => {
    for (const c of [
      "Green Templeton",
      "Kellogg",
      "Linacre",
      "Nuffield",
      "Reuben",
      "St Antony's",
      "St Cross",
      "Wolfson",
    ]) {
      assert.deepEqual([...rolesForCollege(c)], ["Masters", "DPhil", "Fellow"], c);
    }
  });

  it("every named college is a canonical college", () => {
    const names = OXFORD_COLLEGES as readonly string[];
    for (const c of names) {
      assert.ok(rolesForCollege(c).length > 0, c);
    }
    assert.ok(names.includes("All Souls"));
    assert.ok(names.includes("St Antony's"));
  });

  it("undergraduate colleges offer everything", () => {
    assert.deepEqual([...rolesForCollege("Keble")], [...ROLE_OPTIONS]);
    assert.deepEqual([...rolesForCollege("Harris Manchester")], [...ROLE_OPTIONS]);
  });

  it("matches loosely and falls back to everything", () => {
    assert.deepEqual([...rolesForCollege(" all souls ")], ["Fellow"]);
    assert.deepEqual([...rolesForCollege("")], [...ROLE_OPTIONS]);
    assert.deepEqual([...rolesForCollege("Somewhere Else")], [...ROLE_OPTIONS]);
  });
});

describe("roleNeedsYear", () => {
  it("fellows have no year", () => {
    assert.equal(roleNeedsYear("Fellow"), false);
    assert.equal(roleNeedsYear(" Fellow "), false);
  });
  it("students do", () => {
    assert.equal(roleNeedsYear("Undergrad"), true);
    assert.equal(roleNeedsYear("DPhil"), true);
    assert.equal(roleNeedsYear(""), true);
  });
});

describe("formatYearRole", () => {
  it("joins year and role", () => {
    assert.equal(formatYearRole("2", "Undergrad"), "2nd year · Undergrad");
  });
  it("a fellow shows only Fellow, even with a stale year", () => {
    assert.equal(formatYearRole("", "Fellow"), "Fellow");
    assert.equal(formatYearRole("3", "Fellow"), "Fellow");
  });
  it("leaves no dangling separators", () => {
    assert.equal(formatYearRole("", "Masters"), "Masters");
    assert.equal(formatYearRole("1", ""), "1st year");
    assert.equal(formatYearRole("", ""), "");
    assert.equal(formatYearRole(undefined, undefined), "");
  });
});

describe("roleChoices", () => {
  it("offers the college's roles", () => {
    assert.deepEqual(roleChoices("Kellogg", ""), ["Masters", "DPhil", "Fellow"]);
  });
  it("keeps a legacy or disallowed current value visible", () => {
    assert.deepEqual(roleChoices("Kellogg", "Undergrad"), ["Undergrad", "Masters", "DPhil", "Fellow"]);
    assert.deepEqual(roleChoices("All Souls", "Visiting"), ["Visiting", "Fellow"]);
  });
});

describe("roleAfterCollegeChange", () => {
  it("auto-picks the only role", () => {
    assert.equal(roleAfterCollegeChange("All Souls", ""), "Fellow");
    assert.equal(roleAfterCollegeChange("All Souls", "Undergrad"), "Fellow");
  });
  it("keeps an allowed role", () => {
    assert.equal(roleAfterCollegeChange("Kellogg", "DPhil"), "DPhil");
    assert.equal(roleAfterCollegeChange("Keble", "Fellow"), "Fellow");
  });
  it("clears a role the new college does not have", () => {
    assert.equal(roleAfterCollegeChange("Kellogg", "Undergrad"), "");
    assert.equal(roleAfterCollegeChange("Keble", ""), "");
  });
  it("leaves a legacy free-text role alone", () => {
    assert.equal(roleAfterCollegeChange("Kellogg", "Postdoc"), "Postdoc");
  });
});
