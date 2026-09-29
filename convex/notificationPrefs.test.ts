import { describe, expect, test } from "vitest";
import { emailAllowed, pushAllowed, resolvePrefs } from "./notificationPrefs";
import { categoryOf, NOTIFICATION_KINDS } from "./notificationKinds";

describe("notification prefs", () => {
  test("defaults: push everything, email all but social", () => {
    expect(resolvePrefs({})).toEqual({
      push: { bookings: true, invites: true, social: true, credits: true },
      email: { bookings: true, invites: true, social: false, credits: true },
    });
  });

  test("legacy emailNotifications: false turns every email default off", () => {
    const user = { emailNotifications: false };
    expect(resolvePrefs(user).email).toEqual({
      bookings: false,
      invites: false,
      social: false,
      credits: false,
    });
    expect(pushAllowed(user, "bookings")).toBe(true);
  });

  test("saved prefs win over the legacy switch", () => {
    const user = {
      emailNotifications: false,
      notificationPrefs: {
        push: { bookings: false, invites: true, social: true, credits: true },
        email: { bookings: true, invites: true, social: true, credits: false },
      },
    };
    expect(pushAllowed(user, "bookings")).toBe(false);
    expect(emailAllowed(user, "social")).toBe(true);
    expect(emailAllowed(user, "credits")).toBe(false);
  });

  test("every kind belongs to exactly one category", () => {
    expect(NOTIFICATION_KINDS).toHaveLength(16);
    expect(categoryOf("party_invite")).toBe("invites");
    expect(categoryOf("wishlist_listing")).toBe("credits");
    expect(categoryOf("now_friends")).toBe("social");
    expect(categoryOf("swap_undone")).toBe("bookings");
  });
});
