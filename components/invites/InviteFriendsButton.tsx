"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { shareOrCopy } from "@/lib/invites/share";

const STYLES = {
  ink: "rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-2 text-sm font-bold text-[var(--bg)]",
  outline:
    "rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-2 text-sm font-bold text-[var(--ink)]",
  link: "text-xs font-bold text-[var(--ink)] underline underline-offset-2",
  /** Matches "Edit profile" beside it. */
  plain:
    "rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-center text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]",
} as const;

/** Shares your personal invite link (share sheet on phones, copy on desktop). */
export function InviteFriendsButton({
  variant = "outline",
  className = "",
}: {
  variant?: keyof typeof STYLES;
  className?: string;
}) {
  const getCode = useMutation(api.invites.getOrCreateMyInviteCode);
  const [state, setState] = useState<"idle" | "busy" | "copied">("idle");

  const onClick = async () => {
    setState("busy");
    try {
      const code = await getCode({});
      const result = await shareOrCopy(`${window.location.origin}/i/${code}`, "Join me on Oxformals");
      if (result === "copied") {
        setState("copied");
        window.setTimeout(() => setState("idle"), 1500);
        return;
      }
    } catch {
      // Not signed in fully, or offline: nothing to share.
    }
    setState("idle");
  };

  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={() => void onClick()}
      className={`cursor-pointer disabled:opacity-50 ${STYLES[variant]} ${className}`}
    >
      {state === "copied" ? "Link copied" : "Invite friends"}
    </button>
  );
}
