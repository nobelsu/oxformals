"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/convex/notificationCopy";
import { Avatar } from "@/components/ui/Avatar";
import type { AvatarSource } from "@/lib/auth/types";
import { BellIcon } from "./BellIcon";

export type BellItem = FunctionReturnType<
  typeof api.notifications.listMyNotifications
>["page"][number];

const ink =
  "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3.5 py-1 text-[13px] font-bold text-[var(--bg)] disabled:opacity-50";
const outline =
  "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-[13px] font-bold text-[var(--ink)] disabled:opacity-50";

function RowActions({ item }: { item: BellItem }) {
  const respond = useMutation(api.partyInvites.respondToPartyInvite);
  const accept = useMutation(api.listings.acceptRequest);
  const decline = useMutation(api.listings.declineRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { action, requestId } = item;
  if (!action || !requestId) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode = null;
  if (action.type === "party") {
    body =
      action.state === "pending" ? (
        <>
          <button type="button" disabled={busy} className={ink}
            onClick={() => void run(() => respond({ requestId: requestId as Id<"requests">, response: "in" }))}>
            I&apos;m in
          </button>
          <button type="button" disabled={busy} className={outline}
            onClick={() => void run(() => respond({ requestId: requestId as Id<"requests">, response: "out" }))}>
            Not me
          </button>
        </>
      ) : action.state === "in" ? (
        <span className="text-xs text-[var(--ink-muted)]">You&apos;re in.</span>
      ) : action.state === "out" ? (
        <span className="text-xs text-[var(--ink-muted)]">You said not me.</span>
      ) : null;
  } else {
    body =
      action.state === "pending" ? (
        <>
          <button type="button" disabled={busy} className={ink}
            onClick={() => void run(() => accept({ requestId: requestId as Id<"requests"> }))}>
            Accept
          </button>
          <button type="button" disabled={busy} className={outline}
            onClick={() => void run(() => decline({ requestId: requestId as Id<"requests"> }))}>
            Decline
          </button>
        </>
      ) : (
        <span className="text-xs text-[var(--ink-muted)]">
          {action.state === "accepted" ? "Accepted." : action.state === "declined" ? "Declined." : "Withdrawn."}
        </span>
      );
  }
  if (!body) return null;
  return (
    <>
      <div className="mt-2 flex items-center gap-2">{body}</div>
      {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
    </>
  );
}

export function NotificationRow({
  item,
  isNew,
  nowMs,
  onNavigate,
}: {
  item: BellItem;
  isNew: boolean;
  nowMs: number;
  onNavigate: () => void;
}) {
  return (
    <li className="flex gap-3 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)] px-4 py-3">
      <Link href={item.url} onClick={onNavigate} className="shrink-0" tabIndex={-1} aria-hidden>
        {item.actor ? (
          <Avatar
            name={item.actor.name ?? "Someone"}
            size="sm"
            source={item.actor.avatar as AvatarSource | undefined}
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)]">
            <BellIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={item.url} onClick={onNavigate} className="block text-sm leading-snug text-[var(--ink)]">
          {item.segments.map((s, i) =>
            s.bold ? (
              <span key={i} className="font-bold">{s.text}</span>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </Link>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{relativeTime(item.createdAt, nowMs)}</p>
        <RowActions item={item} />
      </div>
      {isNew ? (
        <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
      ) : null}
    </li>
  );
}
