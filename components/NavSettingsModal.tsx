"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Modal } from "@/components/ui/Modal";
import { UiFontDropdown } from "@/components/ui/UiFontDropdown";
import type { UiFontId } from "@/convex/uiFont";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NavSettingsModal({ open, onClose }: Props) {
  const { user, updateProfile } = useAuth();
  const fontPickerRef = useRef<HTMLDivElement | null>(null);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontBusy, setFontBusy] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );

  const notificationsOn = user?.emailNotifications !== false;

  const handleClose = useCallback(() => {
    setFontPickerOpen(false);
    setFontError(null);
    setNotificationsError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !fontPickerOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        fontPickerRef.current &&
        !fontPickerRef.current.contains(target)
      ) {
        setFontPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, fontPickerOpen]);

  const onFontChange = useCallback(
    async (next: UiFontId) => {
      if (!user || next === user.uiFont) return;
      setFontError(null);
      setFontBusy(true);
      try {
        await updateProfile({ uiFont: next });
      } catch {
        setFontError("Could not save theme — try again.");
      } finally {
        setFontBusy(false);
      }
    },
    [user, updateProfile],
  );

  const onNotificationsToggle = useCallback(async () => {
    if (!user || notificationsBusy) return;
    const next = !notificationsOn;
    setNotificationsError(null);
    setNotificationsBusy(true);
    try {
      await updateProfile({ emailNotifications: next });
    } catch {
      setNotificationsError("Could not save notification preference — try again.");
    } finally {
      setNotificationsBusy(false);
    }
  }, [user, notificationsOn, notificationsBusy, updateProfile]);

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Settings"
      bodyScrollable={false}
    >
      <div id="nav-settings-panel" className="min-w-0 w-full space-y-6">
        <div>
          <label className="flex flex-col gap-2">
            <span
              id="nav-settings-theme-label"
              className="text-sm text-[var(--ink-muted)]"
            >
              Theme
            </span>
            <UiFontDropdown
              ref={fontPickerRef}
              aria-labelledby="nav-settings-theme-label"
              value={user.uiFont}
              onChange={(id) => {
                void onFontChange(id);
              }}
              open={fontPickerOpen}
              onOpenChange={(next) => {
                setFontPickerOpen(next);
              }}
              disabled={fontBusy}
            />
          </label>
          {fontError ? (
            <p className="mt-2 text-sm text-[var(--danger)]">{fontError}</p>
          ) : null}
        </div>

        <div className="min-w-0 border-t border-[var(--ink-soft)] pt-5">
          <div className="flex items-center justify-between gap-4">
            <span
              id="nav-settings-notifications-label"
              className="text-sm text-[var(--ink-muted)]"
            >
              Notifications
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsOn}
              aria-labelledby="nav-settings-notifications-label"
              disabled={notificationsBusy}
              onClick={() => {
                void onNotificationsToggle();
              }}
              className={`relative h-8 w-14 shrink-0 rounded-full border-[2px] border-[var(--ink)] transition-colors disabled:opacity-60 ${
                notificationsOn
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--paper)]"
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full transition-transform ${
                  notificationsOn
                    ? "translate-x-6 bg-[var(--accent-ink)]"
                    : "translate-x-0 bg-[var(--ink)]"
                }`}
              />
              <span className="sr-only">Toggle notifications</span>
            </button>
          </div>
          {notificationsOn ? (
            <div
              role="status"
              className="relative mt-4 min-w-0 max-w-full rounded-3xl border-[2px] border-[var(--ink)] bg-[var(--paper)] px-4 py-3 pl-6"
            >
              <span
                className="absolute left-2.5 top-3 bottom-3 w-1.5 rounded-full bg-[var(--accent-wash)]"
                aria-hidden
              />
              <p className="max-w-full break-words font-display text-lg uppercase tracking-[0.12em] text-[var(--ink)]">
                Email notifications
              </p>
              <p className="mt-2 max-w-full text-pretty break-words text-sm leading-relaxed text-[var(--ink-muted)]">
                We&apos;ll email you when someone posts a formal at a college on
                your wishlist, and when it&apos;s time to rate a formal you
                attended as a guest. Turn notifications off to unsubscribe.
              </p>
            </div>
          ) : null}
          {notificationsError ? (
            <p className="mt-2 text-sm text-[var(--danger)]">{notificationsError}</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
