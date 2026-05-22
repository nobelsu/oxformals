import type { Doc } from "./_generated/dataModel";

/** True when the user has not opted out of email notifications (default on). */
export function emailNotificationsEnabled(
  user: Pick<Doc<"users">, "emailNotifications" | "emailWishlistAlerts">,
): boolean {
  if (user.emailNotifications !== undefined) {
    return user.emailNotifications !== false;
  }
  return user.emailWishlistAlerts !== false;
}
