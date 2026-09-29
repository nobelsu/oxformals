"use client";

import { forwardRef, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertsPrompt } from "./AlertsPrompt";
import { NotificationRow, type BellItem } from "./NotificationRow";

const PAGE = 30;

const sectionLabel =
  "px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]";

/** Where the desktop dropdown sits: just under the bell, right-aligned to it. */
export type PanelAnchor = { top: number; right: number };

/**
 * Dropdown under the bell on desktop, full-screen sheet on phones. Rendered in
 * a portal: the nav's backdrop blur would otherwise trap the phone sheet.
 * Opening it reads everything; what was unread at that moment stays under
 * "New" (with a dot) until it closes.
 */
export const NotificationPanel = forwardRef<
  HTMLDivElement,
  { alertsEligible: boolean; anchor: PanelAnchor; onClose: () => void }
>(function NotificationPanel({ alertsEligible, anchor, onClose }, ref) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.listMyNotifications,
    {},
    { initialNumItems: PAGE },
  );
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [nowMs] = useState(() => Date.now());
  const [newIds, setNewIds] = useState<Set<string> | null>(null);

  if (newIds === null && status !== "LoadingFirstPage") {
    setNewIds(new Set(results.filter((r) => r.readAt === undefined).map((r) => r._id)));
  }
  const snapshotTaken = newIds !== null;
  useEffect(() => {
    if (snapshotTaken) void markAllRead({});
  }, [snapshotTaken, markAllRead]);

  const isNew = (r: BellItem) => (newIds?.has(r._id) ?? false) || r.readAt === undefined;
  const fresh = results.filter(isNew);
  const earlier = results.filter((r) => !isNew(r));

  const list = (items: BellItem[]) => (
    <ul>
      {items.map((item) => (
        <NotificationRow key={item._id} item={item} isNew={isNew(item)} nowMs={nowMs} onNavigate={onClose} />
      ))}
    </ul>
  );

  const position = {
    "--panel-top": `${anchor.top}px`,
    "--panel-right": `${anchor.right}px`,
  } as CSSProperties;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      style={position}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)] sm:inset-auto sm:right-[var(--panel-right)] sm:top-[var(--panel-top)] sm:max-h-[min(70vh,560px)] sm:w-[360px] sm:rounded-[18px] sm:border-[2px] sm:border-[var(--ink)]"
    >
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3.5">
        <h2 className="font-display text-2xl leading-none">Notifications</h2>
        <div className="flex items-baseline gap-4">
          <button
            type="button"
            onClick={() => {
              void markAllRead({});
              setNewIds(new Set());
            }}
            className="cursor-pointer text-[13px] text-[var(--ink-muted)] underline underline-offset-2"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[13px] font-bold sm:hidden"
          >
            Close
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <AlertsPrompt eligible={alertsEligible} />
        {status === "LoadingFirstPage" ? null : results.length === 0 ? (
          <EmptyState compact icon="bell" title="No notifications yet" />
        ) : (
          <>
            {fresh.length > 0 ? (
              <>
                <p className={sectionLabel}>New</p>
                {list(fresh)}
              </>
            ) : null}
            {earlier.length > 0 ? (
              <>
                <p className={sectionLabel}>Earlier</p>
                {list(earlier)}
              </>
            ) : null}
            {status === "CanLoadMore" ? (
              <div className="flex justify-center px-4 pt-2">
                <button
                  type="button"
                  onClick={() => loadMore(PAGE)}
                  className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-1 text-[13px] font-bold"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
});
