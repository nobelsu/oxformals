"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { SharePopup, shareViaSheet } from "@/components/share/SharePopup";

/** Round share icon: opens the share popup for this profile's link. */
export function ShareProfileButton({ userId, name }: { userId: string; name: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const first = name.split(" ")[0] || name;
  const text = user?.id === userId ? "Find me on Oxformals!" : `${first} is on Oxformals`;
  return (
    <>
      <button
        type="button"
        aria-label={`Share ${name}'s profile`}
        title="Share profile"
        aria-haspopup="dialog"
        onClick={() =>
          void shareViaSheet({ text, url: `${window.location.origin}/profile/${userId}` }).then(
            (shared) => {
              if (!shared) setOpen(true);
            },
          )
        }
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" />
        </svg>
      </button>
      {open ? (
        <SharePopup
          open
          onClose={() => setOpen(false)}
          title="Share profile"
          url={`${window.location.origin}/profile/${userId}`}
          text={text}
        />
      ) : null}
    </>
  );
}
