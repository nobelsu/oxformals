"use client";

import { useConfirm } from "@/components/ui/useConfirm";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import type { AvatarSource } from "@/lib/auth/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Loading";

type FollowState = NonNullable<
  ReturnType<typeof useQuery<typeof api.follows.getFollowState>>
>;

const pill =
  "flex-1 shrink-0 cursor-pointer rounded-full border-[2px] px-5 py-2 text-sm transition-colors disabled:opacity-50";

/** Follow / Requested / Following for someone else's profile. */
export function FollowButton({
  userId,
  name,
  state,
}: {
  userId: string;
  name: string;
  state: FollowState;
}) {
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const id = userId as Id<"users">;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (state.following === "none") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => follow({ userId: id }))}
        className={`${pill} border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[color-mix(in_srgb,var(--ink)_85%,var(--accent))]`}
      >
        {state.followsYou ? "Follow back" : "Follow"}
      </button>
    );
  }

  const first = name.split(" ")[0];
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          state.following === "pending"
            ? void run(() => unfollow({ userId: id }))
            : setConfirming(true)
        }
        className={`${pill} border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]`}
      >
        {state.following === "pending" ? "Requested" : "Following"}
      </button>
      <ConfirmDialog
        open={confirming}
        message={`Unfollow ${first}?`}
        confirmLabel="Unfollow"
        variant="destructive"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await run(() => unfollow({ userId: id }));
        }}
      />
    </>
  );
}

/**
 * The profile's one counts row — formals, reviews, followers, following —
 * with the follower lists behind the last two.
 */
export function ProfileCounts({
  userId,
  state,
  formals,
  reviews,
}: {
  userId: string;
  state: FollowState;
  /** null while loading or hidden (private account). */
  formals: number | null;
  reviews: number | null;
}) {
  const [list, setList] = useState<"followers" | "following" | null>(null);
  const fmt = (n: number | null) => (n === null ? "–" : n > 500 ? "500+" : String(n));
  const cells: { value: string; label: string; open?: "followers" | "following" }[] = [
    { value: fmt(formals), label: formals === 1 ? "formal" : "formals" },
    { value: fmt(reviews), label: reviews === 1 ? "review" : "reviews" },
    {
      value: fmt(state.followers),
      label: state.followers === 1 ? "follower" : "followers",
      open: "followers",
    },
    { value: fmt(state.followingCount), label: "following", open: "following" },
  ];
  return (
    <>
      <div className="grid grid-cols-4">
        {cells.map((c) =>
          c.open && state.canSeeActivity ? (
            <button
              key={c.label}
              type="button"
              onClick={() => setList(c.open!)}
              className="flex cursor-pointer flex-col items-center rounded-xl py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
            >
              <span className="text-[1.2rem] font-bold leading-tight">{c.value}</span>
              <span className="text-xs text-[var(--ink-muted)]">{c.label}</span>
            </button>
          ) : (
            <div key={c.label} className="flex flex-col items-center py-1">
              <span className="text-[1.2rem] font-bold leading-tight">{c.value}</span>
              <span className="text-xs text-[var(--ink-muted)]">{c.label}</span>
            </div>
          ),
        )}
      </div>
      {list ? (
        <FollowListModal
          userId={userId}
          direction={list}
          canRemove={state.isSelf && list === "followers"}
          onClose={() => setList(null)}
        />
      ) : null}
    </>
  );
}

/** Small tags under the name: "Follows you", "Private", follow requests. */
export function FollowTags({ state }: { state: FollowState }) {
  const [requestsOpen, setRequestsOpen] = useState(false);
  const showPrivate = state.isSelf && state.isPrivate;
  const showRequests = state.isSelf && state.requests > 0;
  if (!state.followsYou && !showPrivate && !showRequests) return null;
  return (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {state.followsYou ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-2 py-0.5 text-[0.72rem] text-[var(--ink-muted)]">
            Follows you
          </span>
        ) : null}
        {showPrivate ? (
          <span className="inline-flex items-center gap-1 text-[0.72rem] text-[var(--ink-muted)]">
            <LockIcon /> Private
          </span>
        ) : null}
        {showRequests ? (
          <button
            type="button"
            onClick={() => setRequestsOpen(true)}
            className="cursor-pointer rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[0.75rem] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            {state.requests} follow request{state.requests === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>
      {requestsOpen ? <FollowRequestsModal onClose={() => setRequestsOpen(false)} /> : null}
    </>
  );
}

type PublicUser = {
  _id: string;
  name?: string;
  college?: string;
  avatar?: AvatarSource;
};

function PersonRow({
  user,
  onNavigate,
  actions,
}: {
  user: PublicUser;
  onNavigate: () => void;
  actions?: React.ReactNode;
}) {
  const name = user.name ?? "Oxford student";
  return (
    <li className="flex items-center gap-3 py-2">
      <Link href={`/profile/${user._id}`} onClick={onNavigate} className="shrink-0">
        <Avatar name={name} size="sm" source={user.avatar} />
      </Link>
      <Link href={`/profile/${user._id}`} onClick={onNavigate} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold hover:underline">{name}</span>
        {user.college ? (
          <span className="block truncate text-xs text-[var(--ink-muted)]">{user.college}</span>
        ) : null}
      </Link>
      {actions}
    </li>
  );
}

function FollowListModal({
  userId,
  direction,
  canRemove,
  onClose,
}: {
  userId: string;
  direction: "followers" | "following";
  canRemove: boolean;
  onClose: () => void;
}) {
  const people = useQuery(api.follows.listFollows, {
    userId: userId as Id<"users">,
    direction,
  });
  const removeFollower = useMutation(api.follows.removeFollower);
  const { confirm, dialog } = useConfirm();
  return (
    <Modal
      open
      onClose={onClose}
      title={direction === "followers" ? "Followers" : "Following"}
      panelClassName="max-w-md"
    >
      {people === undefined ? (
        <SkeletonRows count={3} />
      ) : people === null ? (
        <p className="text-sm text-[var(--ink-muted)]">This account is private.</p>
      ) : people.length === 0 ? (
        <EmptyState
          compact
          icon="users"
          title={direction === "followers" ? "No followers yet" : "Not following anyone yet"}
        />
      ) : (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
          {people.map((p) => (
            <PersonRow
              key={p._id}
              user={p as PublicUser}
              onNavigate={onClose}
              actions={
                canRemove ? (
                  <button
                    type="button"
                    onClick={() =>
                      confirm(
                        `Remove ${p.name?.split(" ")[0] ?? "this follower"}? They won't be told, and can follow you again.`,
                        "Remove",
                        () => removeFollower({ userId: p._id }).then(() => undefined),
                      )
                    }
                    className="cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] px-3 py-1 text-xs hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                  >
                    Remove
                  </button>
                ) : null
              }
            />
          ))}
        </ul>
      )}
      {dialog}
    </Modal>
  );
}

function FollowRequestsModal({ onClose }: { onClose: () => void }) {
  const people = useQuery(api.follows.listFollowRequests, {});
  const approve = useMutation(api.follows.approveFollower);
  const decline = useMutation(api.follows.removeFollower);
  return (
    <Modal open onClose={onClose} title="Follow requests" panelClassName="max-w-md">
      {people === undefined ? (
        <SkeletonRows count={2} />
      ) : people.length === 0 ? (
        <EmptyState compact icon="users" title="No one's waiting" />
      ) : (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
          {people.map((p) => (
            <PersonRow
              key={p._id}
              user={p as PublicUser}
              onNavigate={onClose}
              actions={
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void approve({ userId: p._id })}
                    className="cursor-pointer rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void decline({ userId: p._id })}
                    className="cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] px-3 py-1 text-xs hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                  >
                    Decline
                  </button>
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Stands in for a private account's activity when you don't follow them. */
export function PrivateActivityNotice({ pending }: { pending: boolean }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_18%,transparent)] px-5 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--ink)]">
        <LockIcon className="h-5 w-5" />
      </span>
      <p className="font-bold">This account is private</p>
      <p className="max-w-[32ch] text-sm text-[var(--ink-muted)]">
        {pending ? "Request sent." : "Follow to see their formals and reviews."}
      </p>
    </div>
  );
}
