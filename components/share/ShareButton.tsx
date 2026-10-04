"use client";

import { useState } from "react";
import { SharePopup, shareViaSheet } from "./SharePopup";
import { shareCard, type ShareKind } from "@/lib/share/shareCard";

type Props = {
  kind: ShareKind;
  id: string;
  /**
   * Page to link to (e.g. `/college/keble`). Listings default to their own
   * deep link. With a link the button opens the share popup; without one it
   * goes straight to the story image.
   */
  path?: string;
  /** Sentence sent along with the link. */
  text?: string;
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

/** Share a listing, review or badge: by link, or as an Instagram story card. */
export function ShareButton({
  kind,
  id,
  path,
  text = "Join me on Oxformals!",
  variant = "icon",
  className = "",
}: Props) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const linkPath = path ?? (kind === "listing" ? `/?tab=browse&listing=${encodeURIComponent(id)}` : null);

  async function onShare() {
    if (state === "busy") return;
    setState("busy");
    try {
      setState((await shareCard(kind, id)) ? "idle" : "error");
    } catch {
      setState("error");
    }
  }

  const label = state === "error" ? "Couldn't make the image. Try again" : "Share";
  const onPress = () => {
    if (!linkPath) {
      void onShare();
      return;
    }
    void shareViaSheet({ text, url: window.location.origin + linkPath }).then((shared) => {
      if (!shared) setMenuOpen(true);
    });
  };

  const menu =
    linkPath && menuOpen ? (
      <SharePopup
        open
        onClose={() => setMenuOpen(false)}
        url={window.location.origin + linkPath}
        text={text}
        onStoryImage={() => shareCard(kind, id)}
      />
    ) : null;

  if (variant === "pill") {
    return (
      <>
      <button
        type="button"
        onClick={onPress}
        aria-haspopup={linkPath ? "dialog" : undefined}
        disabled={state === "busy"}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60 ${className}`}
      >
        <ShareIcon />
        {state === "busy" ? "Making image…" : state === "error" ? "Try again" : "Share"}
      </button>
      {menu}
      </>
    );
  }

  return (
    <>
    <button
      type="button"
      onClick={onPress}
      aria-haspopup={linkPath ? "dialog" : undefined}
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
    {menu}
    </>
  );
}
