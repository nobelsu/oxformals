import { beforeEach, vi } from "vitest";

// Notification delivery, emails and pushes are scheduled functions that call
// web-push, Expo and Resend. With fake timers they stay queued in
// `_scheduled_functions` (tests can still inspect them) and never run.
beforeEach(() => {
  vi.useFakeTimers();
});
