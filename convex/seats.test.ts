import { describe, expect, test } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { requestSeats, unclaimedLinkSeats } from "./seats";

const req = (party: unknown[]) =>
  ({ fromUserId: "u1", requestType: "credit", party }) as unknown as Doc<"requests">;

describe("link seats", () => {
  test("an open link seat takes a seat; an expired one doesn't", () => {
    const r = req([
      { kind: "link", token: "a", payerId: "u1", method: "credit", paysOwn: true, response: "pending", expiresAt: 1 },
      { kind: "link", token: "b", payerId: "u1", method: "pay", response: "out", expiresAt: 1 },
    ]);
    expect(requestSeats(r).map((s) => s.kind)).toEqual(["requester", "guest"]);
    expect(unclaimedLinkSeats(r)).toBe(1);
  });

  test("friends and guests are unchanged", () => {
    const r = req([
      { kind: "friend", userId: "u2", payerId: "u2", method: "credit", response: "in" },
      { kind: "guest", payerId: "u1", method: "pay" },
    ]);
    expect(requestSeats(r).map((s) => s.kind)).toEqual(["requester", "friend", "guest"]);
    expect(unclaimedLinkSeats(r)).toBe(0);
  });
});
