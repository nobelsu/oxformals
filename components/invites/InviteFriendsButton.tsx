"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SharePopup, shareViaSheet } from "@/components/share/SharePopup";

const INVITE_TEXT = "Join me on Oxformals!";

const STYLES = {
  ink: "rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-2 text-sm font-bold text-[var(--bg)]",
  outline:
    "rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-2 text-sm font-bold text-[var(--ink)]",
  link: "text-xs font-bold text-[var(--ink)] underline underline-offset-2",
  /** Matches "Edit profile" beside it. */
  plain:
    "rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-center text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]",
} as const;

/** Opens the share popup for your personal invite link. */
export function InviteFriendsButton({
  variant = "outline",
  className = "",
}: {
  variant?: keyof typeof STYLES;
  className?: string;
}) {
  const getCode = useMutation(api.invites.getOrCreateMyInviteCode);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    try {
      const code = await getCode({});
      const link = `${window.location.origin}/i/${code}`;
      if (!(await shareViaSheet({ text: INVITE_TEXT, url: link }))) setUrl(link);
    } catch {
      // Not signed in fully, or offline: nothing to share.
    }
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className={`cursor-pointer disabled:opacity-50 ${STYLES[variant]} ${className}`}
      >
        Invite friends
      </button>
      {url ? (
        <SharePopup
          open
          onClose={() => setUrl(null)}
          title="Invite friends"
          url={url}
          text={INVITE_TEXT}
        />
      ) : null}
    </>
  );
}
