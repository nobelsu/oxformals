import { describe, expect, test, vi } from "vitest";
import { sendToSubscriptions } from "./webPushCore";

const sub = (endpoint: string) => ({ endpoint, p256dh: "p", auth: "a" });

describe("sendToSubscriptions", () => {
  test("returns endpoints the push service says are gone", async () => {
    const statuses: Record<string, number> = { a: 201, b: 410, c: 404, d: 500 };
    const send = vi.fn(async (s: { endpoint: string }) => statuses[s.endpoint]);
    const gone = await sendToSubscriptions(
      [sub("a"), sub("b"), sub("c"), sub("d")],
      '{"title":"Hi"}',
      send,
    );
    expect(gone).toEqual(["b", "c"]);
    expect(send).toHaveBeenCalledTimes(4);
  });

  test("one failure doesn't stop the rest", async () => {
    const send = vi.fn(async (s: { endpoint: string }) => {
      if (s.endpoint === "a") throw new Error("network");
      return 201;
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendToSubscriptions([sub("a"), sub("b")], "{}", send)).toEqual([]);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
