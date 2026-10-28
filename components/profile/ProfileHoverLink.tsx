"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/follows/FollowControls";
import { formatYearRole } from "@/lib/data/roles";
import type { AvatarSource } from "@/lib/auth/types";

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 150;
const CARD_WIDTH = 288;
const GAP = 8;

type Props = {
  userId: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

/**
 * A link to someone's profile that, on a desktop pointer, shows a small
 * preview of them after a short hover. Touch screens just follow the link.
 */
export function ProfileHoverLink({ userId, className, title, children }: Props) {
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  useEffect(() => clearTimers, []);

  // A fixed-position card would drift on scroll, so close it instead.
  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  const scheduleOpen = () => {
    if (!canHover) return;
    clearTimers();
    openTimer.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(GAP, rect.left),
        window.innerWidth - CARD_WIDTH - GAP,
      );
      setPosition({ top: rect.bottom + GAP, left });
    }, OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = null;
    closeTimer.current = window.setTimeout(() => setPosition(null), CLOSE_DELAY_MS);
  };

  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

  return (
    <>
      <Link
        ref={anchorRef}
        href={`/profile/${userId}`}
        title={title}
        className={className}
        onClick={stop}
        onKeyDown={stop}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        {children}
      </Link>
      {position
        ? createPortal(
            <div
              role="dialog"
              aria-label="Profile preview"
              style={{ top: position.top, left: position.left, width: CARD_WIDTH }}
              className="fixed z-[70] rounded-[16px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4 text-[var(--ink)] shadow-[0_10px_28px_color-mix(in_srgb,var(--ink)_22%,transparent)]"
              onMouseEnter={clearTimers}
              onMouseLeave={scheduleClose}
              onClick={stop}
            >
              <ProfilePreview userId={userId} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ProfilePreview({ userId }: { userId: string }) {
  const { user: me, isAuthenticated } = useAuth();
  const profile = useQuery(api.users.getPublicProfile, { userId: userId as Id<"users"> });
  const follow = useQuery(api.follows.getFollowState, { userId: userId as Id<"users"> });

  if (profile === undefined) {
    return <div className="h-24 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />;
  }
  if (profile === null) {
    return <p className="text-sm text-[var(--ink-muted)]">This profile isn&apos;t available.</p>;
  }

  const user = profile.user;
  const name = user.name ?? "Someone";
  const line = [user.college, formatYearRole(user.year, user.role)].filter(Boolean).join(" · ");
  const isMe = me?.id === userId;

  return (
    <div className="flex flex-col gap-3">
      <Link href={`/profile/${userId}`} className="flex items-center gap-3">
        <Avatar name={name} size="lg" source={user.avatar as AvatarSource | undefined} />
        <span className="min-w-0">
          <span className="block truncate font-display text-xl leading-tight hover:underline">{name}</span>
          {line ? <span className="block truncate text-sm text-[var(--ink-soft)]">{line}</span> : null}
        </span>
      </Link>
      {user.bio ? <p className="line-clamp-3 text-sm leading-snug">{user.bio}</p> : null}
      {follow ? (
        <p className="text-sm text-[var(--ink-muted)]">
          <span className="font-semibold text-[var(--ink)]">{follow.followers}</span>{" "}
          {follow.followers === 1 ? "follower" : "followers"} ·{" "}
          <span className="font-semibold text-[var(--ink)]">{follow.followingCount}</span> following
        </p>
      ) : null}
      {isAuthenticated && !isMe && follow ? (
        <div className="flex">
          <FollowButton userId={userId} name={name} state={follow} />
        </div>
      ) : null}
    </div>
  );
}
