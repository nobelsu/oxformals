"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ensureWebPushSubscription } from "@/lib/push/webPush";
import { BellIcon } from "./BellIcon";
import {
  NOTIFICATION_PAGE,
  NotificationPanel,
  type PanelAnchor,
} from "./NotificationPanel";

const SYNCED_KEY = "oxformals.pushSynced";

export function NotificationBell() {
  const bell = useQuery(api.notifications.getBellState, {});
  // Loaded up front (not when the panel opens) so the list is already there.
  const feed = usePaginatedQuery(
    api.notifications.listMyNotifications,
    {},
    { initialNumItems: NOTIFICATION_PAGE },
  );
  const save = useMutation(api.notifications.saveWebPushSubscription);
  const [anchor, setAnchor] = useState<PanelAnchor | null>(null);
  const open = anchor !== null;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const measure = (): PanelAnchor | null => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { top: rect.bottom + 12, right: Math.max(8, window.innerWidth - rect.right) };
  };
  const close = () => setAnchor(null);
  const pathname = usePathname();

  // Close when the route changes (e.g. after tapping a row).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) close();
  }

  // Alerts already allowed here: keep this browser's subscription saved,
  // once per session. Never prompts.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SYNCED_KEY) === "1") return;
      window.sessionStorage.setItem(SYNCED_KEY, "1");
    } catch {
      // Storage blocked: sync anyway.
    }
    void ensureWebPushSubscription((sub) => save(sub), { prompt: false }).catch(() => {});
  }, [save]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setAnchor(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAnchor(null);
    };
    const onResize = () => setAnchor((a) => (a ? measure() : a));
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (!bell) return null;
  const badge = bell.unread >= 10 ? "9+" : bell.unread > 0 ? String(bell.unread) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={badge ? `Notifications, ${badge} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-onboarding="bell"
        ref={buttonRef}
        onClick={() => setAnchor(open ? null : measure())}
        className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--nav-ink)] text-[var(--nav-ink)] transition-colors hover:bg-[var(--nav-ink)] hover:text-[var(--nav-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      >
        <BellIcon />
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full border-2 border-[var(--nav-bg)] bg-[var(--nav-ink)] px-1 text-center text-[11px] font-bold leading-4 text-[var(--nav-bg)]">
            {badge}
          </span>
        ) : null}
      </button>
      {anchor ? (
        <NotificationPanel
          ref={panelRef}
          alertsEligible={bell.alertsEligible}
          anchor={anchor}
          feed={feed}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
