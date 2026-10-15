import { describe, expect, test } from "vitest";
import { decideCard, matchCollege, namesMatch, type CardRead } from "./cardRules";

const good: CardRead = {
  isOxfordUniversityCard: true,
  name: "Jeremy A. Smith",
  college: "Brasenose College",
  expiry: "2028-06-30",
  confidence: "high",
};
const today = "2026-10-15";

describe("matchCollege", () => {
  test("ignores College/Hall, case, punctuation and St/Saint", () => {
    expect(matchCollege("BRASENOSE COLLEGE")).toBe("Brasenose");
    expect(matchCollege("Saint Anne's College")).toBe("St Anne's");
    expect(matchCollege("St Edmund Hall")).toBe("St Edmund Hall");
    expect(matchCollege("Lady Margaret Hall")).toBe("Lady Margaret Hall");
  });
  test("unknown or empty is null", () => {
    expect(matchCollege("Trinity College Cambridge")).toBeNull();
    expect(matchCollege("")).toBeNull();
    expect(matchCollege(null)).toBeNull();
  });
});

describe("namesMatch", () => {
  test("every word of the shorter name appears in the longer", () => {
    expect(namesMatch("Jeremy Smith", "Jeremy A. Smith")).toBe(true);
    expect(namesMatch("jeremy smith", "SMITH, Jeremy")).toBe(true);
    expect(namesMatch("Zoë Rawlings", "Zoe Rawlings")).toBe(true);
  });
  test("initials and nicknames don't match", () => {
    expect(namesMatch("J Smith", "Jeremy Smith")).toBe(false);
    expect(namesMatch("Jem Smith", "Jeremy Smith")).toBe(false);
    expect(namesMatch("", "Jeremy Smith")).toBe(false);
    expect(namesMatch("Jeremy Smith", null)).toBe(false);
  });
});

describe("decideCard", () => {
  test("a clear current card in their name is approved with the list's spelling", () => {
    expect(decideCard(good, "Jeremy Smith", today)).toEqual({ kind: "approve", college: "Brasenose" });
  });
  test("an expired card is rejected", () => {
    expect(decideCard({ ...good, expiry: "2026-10-14" }, "Jeremy Smith", today).kind).toBe("reject");
  });
  test("a card that expires today is still fine", () => {
    expect(decideCard({ ...good, expiry: today }, "Jeremy Smith", today).kind).toBe("approve");
  });
  test("confidently not an Oxford card is rejected", () => {
    expect(
      decideCard({ ...good, isOxfordUniversityCard: false }, "Jeremy Smith", today).kind,
    ).toBe("reject");
  });
  test("anything doubtful goes to review", () => {
    expect(decideCard({ ...good, confidence: "medium" }, "Jeremy Smith", today).kind).toBe("review");
    expect(decideCard({ ...good, college: "Hogwarts" }, "Jeremy Smith", today).kind).toBe("review");
    expect(decideCard({ ...good, expiry: null }, "Jeremy Smith", today).kind).toBe("review");
    expect(decideCard(good, "Someone Else", today).kind).toBe("review");
    expect(
      decideCard({ ...good, isOxfordUniversityCard: false, confidence: "low" }, "Jeremy Smith", today).kind,
    ).toBe("review");
  });
});
