"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  bio: string;
  userId: string;
  /** Show a "Report" link (signed-in viewers looking at someone else). */
  canReport: boolean;
  className?: string;
};

/** A user's bio with line breaks kept; renders nothing when empty. */
export function BioText({ bio, userId, canReport, className = "" }: Props) {
  const reportBio = useMutation(api.bio.reportBio);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const text = bio.trim();
  if (!text) return null;

  async function onReport() {
    setState("busy");
    try {
      await reportBio({ userId: userId as Id<"users"> });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={className}>
      <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-[var(--ink)]">
        {text}
      </p>
      {canReport ? (
        state === "done" ? (
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Reported. Thanks.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void onReport()}
            disabled={state === "busy"}
            className="mt-1 cursor-pointer text-xs text-[var(--ink-soft)] underline-offset-4 hover:text-[var(--ink)] hover:underline disabled:opacity-50"
          >
            {state === "error" ? "Couldn't report. Try again" : "Report"}
          </button>
        )
      ) : null}
    </div>
  );
}
