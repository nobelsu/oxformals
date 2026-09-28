"use client";

import { useState } from "react";
import { shareCard, type ShareKind } from "@/lib/share/shareCard";

type Props = {
  kind: ShareKind;
  id: string;
  /** "icon" for action rows; "pill" for a labelled button. */
  variant?: "icon" | "pill";
  className?: string;
};

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

/** Share an Instagram story card for a listing or review. */
export function ShareButton({ kind, id, variant = "icon", className = "" }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function onShare() {
    if (state === "busy") return;
    setState("busy");
    try {
      setState((await shareCard(kind, id)) ? "idle" : "error");
    } catch {
      setState("error");
    }
  }

  const label =
    state === "error" ? "Couldn't make the image. Try again" : "Share to your story";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => void onShare()}
        disabled={state === "busy"}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60 ${className}`}
      >
        <ShareIcon />
        {state === "busy" ? "Making image…" : state === "error" ? "Try again" : "Share"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      disabled={state === "busy"}
      aria-label={label}
      title={label}
      className={`transition-colors disabled:opacity-50 ${
        state === "error"
          ? "text-[var(--danger)]"
          : "text-[var(--ink)] hover:text-[var(--accent)]"
      } ${className}`}
    >
      <ShareIcon />
    </button>
  );
}
