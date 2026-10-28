import { expect, test } from "vitest";
import { STANFORD_NEEDS_CARD_FROM } from "./allowedEmails";
import { needsCard } from "./membership";

const before = STANFORD_NEEDS_CARD_FROM - 1;
const after = STANFORD_NEEDS_CARD_FROM + 1;

test("Oxford addresses never need a card", () => {
  expect(needsCard({ email: "sam@ox.ac.uk", _creationTime: after })).toBe(false);
  expect(needsCard({ email: "pat@said.oxford.edu", _creationTime: after })).toBe(false);
});

test("Stanford accounts made before the switch keep their access", () => {
  expect(needsCard({ email: "jo@stanford.edu", _creationTime: before })).toBe(false);
  expect(needsCard({ email: "jo@alumni.stanford.edu", _creationTime: before })).toBe(false);
});

test("new Stanford accounts need a card like everyone else", () => {
  expect(needsCard({ email: "jo@stanford.edu", _creationTime: after })).toBe(true);
  expect(needsCard({ email: "jo@alumni.stanford.edu", _creationTime: after })).toBe(true);
});

test("other addresses need a card whenever they were made", () => {
  expect(needsCard({ email: "casey@gmail.com", _creationTime: before })).toBe(true);
  expect(needsCard({ email: "x@notstanford.edu", _creationTime: before })).toBe(true);
});
