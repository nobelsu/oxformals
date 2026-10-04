"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Loading";

/** Round "block" icon on someone's profile, with a confirmation first. */
export function BlockButton({ userId, name }: { userId: string; name: string }) {
  const block = useMutation(api.blocks.block);
  const [open, setOpen] = useState(false);
  const first = name.split(" ")[0] || name;
  return (
    <>
      <button
        type="button"
        aria-label={`Block ${name}`}
        title="Block"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      <ConfirmDialog
        open={open}
        message={`Block ${first}? You won't see each other's formals or activity, and neither of you can follow, message or request the other. ${first} won't be told.`}
        variant="destructive"
        confirmLabel="Block"
        onConfirm={() => {
          setOpen(false);
          void block({ userId: userId as Id<"users"> });
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

/** Replaces Follow and Message on the profile of someone you've blocked. */
export function UnblockButton({ userId, className = "" }: { userId: string; className?: string }) {
  const unblock = useMutation(api.blocks.unblock);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await unblock({ userId: userId as Id<"users"> });
        } finally {
          setBusy(false);
        }
      }}
      className={`cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50 ${className}`}
    >
      Unblock
    </button>
  );
}

/** Settings → Privacy: everyone you've blocked, each with Unblock. */
export function BlockedPeople() {
  const blocks = useQuery(api.blocks.listMyBlocks, {});
  return (
    <div>
      <p className="text-sm font-semibold">Blocked people</p>
      <p className="text-sm text-[var(--ink-muted)]">
        You and they can&apos;t see, follow, message or request each other. Block someone from
        their profile.
      </p>
      {blocks === undefined ? (
        <Skeleton className="mt-4 h-9 w-full" />
      ) : blocks.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--ink-soft)]">You haven&apos;t blocked anyone.</p>
      ) : (
        <ul className="mt-3">
          {blocks.map((b) => (
            <li
              key={b.userId}
              className="flex items-center justify-between gap-4 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] py-3 first:border-t-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{b.name}</span>
                {b.college ? (
                  <span className="block truncate text-xs text-[var(--ink-muted)]">{b.college}</span>
                ) : null}
              </span>
              <UnblockButton userId={b.userId} className="!px-4 !py-1.5" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
