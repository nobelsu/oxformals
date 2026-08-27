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

export function SettingsModal({ open, onClose }: Props) {
  const { user, updateProfile, hasPassword, setPassword } = useAuth();
  const fontPickerRef = useRef<HTMLDivElement | null>(null);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontBusy, setFontBusy] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const notificationsOn = user?.emailNotifications !== false;

  const handleClose = useCallback(() => {
    setFontPickerOpen(false);
    setFontError(null);
    setNotificationsError(null);
    setPasswordInput("");
    setPasswordConfirm("");
    setPasswordError(null);
    setPasswordSaved(false);
    onClose();
  }, [onClose]);

  const onSetPassword = useCallback(async () => {
    if (passwordBusy) return;
    setPasswordError(null);
    if (passwordInput.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (passwordInput !== passwordConfirm) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await setPassword(passwordInput);
      setPasswordInput("");
      setPasswordConfirm("");
      setPasswordSaved(true);
    } catch {
      setPasswordError("Could not set your password — try again.");
    } finally {
      setPasswordBusy(false);
    }
  }, [passwordBusy, passwordInput, passwordConfirm, setPassword]);

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
      <div id="settings-panel" className="min-w-0 w-full space-y-6">
        <div>
          <label className="flex flex-col gap-2">
            <span
              id="settings-theme-label"
              className="text-sm text-[var(--ink-muted)]"
            >
              Theme
            </span>
            <UiFontDropdown
              ref={fontPickerRef}
              aria-labelledby="settings-theme-label"
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
              id="settings-notifications-label"
              className="text-sm text-[var(--ink-muted)]"
            >
              Notifications
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsOn}
              aria-labelledby="settings-notifications-label"
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

        {hasPassword !== undefined ? (
          <div className="min-w-0 border-t border-[var(--ink-soft)] pt-5">
            <span className="text-sm text-[var(--ink-muted)]">Password</span>
            {hasPassword || passwordSaved ? (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                Password is set. You can sign in with your email and password.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm text-[var(--ink-muted)]">
                  Set a password to sign in without an email code.
                </p>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  disabled={passwordBusy}
                  className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-4 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--accent-hover)] disabled:opacity-60"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Confirm password"
                  disabled={passwordBusy}
                  className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-4 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--accent-hover)] disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={passwordBusy}
                  onClick={() => {
                    void onSetPassword();
                  }}
                  className="w-full cursor-pointer rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--accent-ink)] py-2.5 text-base transition-colors"
                >
                  {passwordBusy ? "Saving…" : "Set password"}
                </button>
              </div>
            )}
            {passwordError ? (
              <p className="mt-2 text-sm text-[var(--danger)]">{passwordError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
