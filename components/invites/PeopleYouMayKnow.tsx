"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Avatar } from "@/components/ui/Avatar";
import type { AvatarSource } from "@/lib/auth/types";

type Person = FunctionReturnType<typeof api.peopleYouMayKnow.getPeopleYouMayKnow>[number];

function reason(p: Person): string {
  if (p.mutualFriends > 0) {
    return `${p.mutualFriends} mutual friend${p.mutualFriends === 1 ? "" : "s"}`;
  }
  if (p.sharedFormals > 0) {
    return `${p.sharedFormals} formal${p.sharedFormals === 1 ? "" : "s"} together`;
  }
  return p.user.college ?? "";
}

export function PeopleYouMayKnow({ limit = 5, className = "" }: { limit?: number; className?: string }) {
  const people = useQuery(api.peopleYouMayKnow.getPeopleYouMayKnow, { limit });
  const follow = useMutation(api.follows.follow);
  const [busy, setBusy] = useState<string | null>(null);
  if (!people || people.length === 0) return null;

  return (
    <section
      aria-label="People you may know"
      className={`rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.35)] ${className}`}
    >
      <p className="text-sm font-bold text-[var(--ink)]">People you may know</p>
      <ul className="mt-1 flex flex-col">
        {people.map((p) => (
          <li key={p.user._id} className="flex items-center gap-3 py-2">
            <Link href={`/profile/${p.user._id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={p.user.name ?? "Someone"} size="sm" source={p.user.avatar as AvatarSource | undefined} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[var(--ink)]">{p.user.name}</span>
                <span className="block truncate text-xs text-[var(--ink-muted)]">{reason(p)}</span>
              </span>
            </Link>
            <button
              type="button"
              disabled={busy === p.user._id}
              onClick={async () => {
                setBusy(p.user._id);
                try {
                  await follow({ userId: p.user._id });
                } finally {
                  setBusy(null);
                }
              }}
              className="shrink-0 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3 py-1 text-xs font-bold text-[var(--bg)] disabled:opacity-50"
            >
              Follow
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
