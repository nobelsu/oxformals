import { describe, expect, test } from "vitest";
import {
  notificationEmail,
  relativeTime,
  renderNotification,
  type NotificationView,
} from "./notificationCopy";

const THU = "2026-10-15T18:30:00.000Z"; // Thu 15 Oct, 7:30pm in London

const view = (v: Partial<NotificationView> & Pick<NotificationView, "kind">): NotificationView => ({
  actorName: "Maya",
  actorId: "u_maya",
  listingId: "l_1",
  requestId: "r_1",
  data: { college: "Worcester", dateTime: THU },
  ...v,
});

describe("renderNotification", () => {
  test("party invite names the friend and the formal", () => {
    const r = renderNotification(view({ kind: "party_invite" }));
    expect(r.body).toBe("Maya added you to their group for Worcester, Thu 15 Oct");
    expect(r.segments.filter((s) => s.bold).map((s) => s.text)).toEqual(["Maya", "Worcester"]);
    expect(r.url).toBe("/");
  });

  test("a request for several seats says so and opens the requests page", () => {
    const r = renderNotification(
      view({ kind: "request_received", actorName: "Tom", data: { college: "Keble", count: 3 } }),
    );
    expect(r.body).toBe("Tom wants 3 seats at your Keble formal");
    expect(r.title).toBe("New request");
    expect(r.url).toBe("/requests/l_1");
  });

  test("now friends links to their profile", () => {
    const r = renderNotification(view({ kind: "now_friends", actorName: "Priya", actorId: "u_p" }));
    expect(r.body).toBe("You and Priya are now friends.");
    expect(r.url).toBe("/profile/u_p");
  });

  test("payouts need no actor", () => {
    const r = renderNotification(
      view({ kind: "credit_paid_out", actorName: null, data: { college: "Keble", count: 2 } }),
    );
    expect(r.body).toBe("You earned 2 spoons for hosting at Keble.");
  });

  test("a referral credit names who joined", () => {
    const r = renderNotification(
      view({ kind: "credit_earned", actorName: "Sam", data: { reason: "referral", count: 1 } }),
    );
    expect(r.body).toBe("You earned 1 spoon. Sam went to their first formal.");
  });

  test("a missing actor reads as Someone", () => {
    const r = renderNotification(view({ kind: "new_follower", actorName: null }));
    expect(r.body).toBe("Someone followed you.");
  });
});

describe("notificationEmail", () => {
  test("party invite: ticket with the payment tag, I'm in and Not me", () => {
    const e = notificationEmail(
      view({ kind: "party_invite", data: { college: "Worcester", dateTime: THU, paysOwn: true, method: "credit" } }),
    );
    expect(e).toMatchObject({
      subject: "Maya wants to bring you to Worcester",
      eyebrow: "Group invite",
      heading: "Maya added you to their group",
      ticket: { college: "Worcester", tag: "You pay 1 spoon" },
      cta: { label: "I'm in", path: "/" },
      secondary: { label: "Not me", path: "/" },
    });
    expect(e?.ticket?.when).toContain("Thu 15 Oct");
  });

  test("kinds without an email return null", () => {
    expect(notificationEmail(view({ kind: "new_follower" }))).toBeNull();
    expect(notificationEmail(view({ kind: "request_received" }))).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  test.each([
    [now - 30_000, "Now"],
    [now - 4 * 60_000, "4m"],
    [now - 2 * 3_600_000, "2h"],
    [now - 30 * 3_600_000, "Yesterday"],
    [now - 3 * 86_400_000, "3d"],
  ])("%s → %s", (ms, label) => {
    expect(relativeTime(ms, now)).toBe(label);
  });

  test("older than a week shows the date", () => {
    expect(relativeTime(now - 10 * 86_400_000, now)).toBe("5 Oct");
  });
});
