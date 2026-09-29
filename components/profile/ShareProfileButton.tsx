"use client";

import { useState } from "react";

/** Round share icon: the phone's share sheet, or copies the link on desktop. */
export function ShareProfileButton({ userId, name }: { userId: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Link copied" : `Share ${name}'s profile`}
      title={copied ? "Link copied" : "Share profile"}
      onClick={async () => {
        const url = `${window.location.origin}/profile/${userId}`;
        if (navigator.share) {
          try {
            await navigator.share({ title: `${name} on Oxformals`, url });
            return;
          } catch {
            // Cancelled or unsupported: fall back to copying.
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Nothing else to do.
        }
      }}
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12l5 5 9-10" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" />
        </svg>
      )}
    </button>
  );
}
