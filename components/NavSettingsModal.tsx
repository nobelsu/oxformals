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
  const [notificationsOn, setNotificationsOn] = useState(false);

  const handleClose = useCallback(() => {
    setFontPickerOpen(false);
    setFontError(null);
    setNotificationsOn(false);
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
              onClick={() => setNotificationsOn((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full border-[2px] border-[var(--ink)] transition-colors ${
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
                className="absolute left-2.5 top-3 bottom-3 w-1.5 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
              <p className="max-w-full break-words font-display text-lg uppercase tracking-[0.12em] text-[var(--ink)]">
                Still on the drawing board
              </p>
              <p className="mt-2 max-w-full text-pretty break-words text-sm leading-relaxed text-[var(--ink-muted)]">
                We&apos;re doodling bells &amp; pings behind the scenes — check
                back soon and we&apos;ll make a fuss when it&apos;s ready.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
