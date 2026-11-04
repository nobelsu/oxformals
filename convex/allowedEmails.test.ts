import { expect, test } from "vitest";
import { canSignUp, isAllowedEmail, isEduEmail } from "./allowedEmails";

test("Oxford SSO and Saïd addresses get in without a card", () => {
  for (const email of [
    "abcd1234@ox.ac.uk",
    " Sam@OX.AC.UK ",
    "pat@said.ox.ac.uk",
    "pat@oxford.said.edu",
    "pat@said.oxford.edu",
  ]) {
    expect(isAllowedEmail(email)).toBe(true);
    expect(canSignUp(email)).toBe(true);
  }
});

test("college addresses are refused, so nobody gets a second account", () => {
  expect(isAllowedEmail("nadia.t@exeter.ox.ac.uk")).toBe(false);
  expect(canSignUp("nadia.t@exeter.ox.ac.uk")).toBe(false);
  expect(canSignUp("someone@chch.ox.ac.uk")).toBe(false);
});

test(".edu addresses can sign up (and need a card)", () => {
  for (const email of ["jo@stanford.edu", "jo@alumni.stanford.edu", "kim@mit.edu"]) {
    expect(isEduEmail(email)).toBe(true);
    expect(isAllowedEmail(email)).toBe(false);
    expect(canSignUp(email)).toBe(true);
  }
});

test("everything else is refused", () => {
  for (const email of [
    "casey@gmail.com",
    "x@edu.example.com",
    "x@fake.edu.com",
    "x@ox.ac.uk.evil.com",
    "",
    null,
    undefined,
  ]) {
    expect(canSignUp(email)).toBe(false);
  }
});
