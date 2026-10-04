"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SharePopup, shareViaSheet } from "@/components/share/SharePopup";

const SEAT_TEXT = "A seat for you on Oxformals";

/** After sending: one link per new person, to share. */
export function SeatLinksModal({ tokens, onClose }: { tokens: string[]; onClose: () => void }) {
  const [sharing, setSharing] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <>
    <Modal
      open={tokens.length > 0}
      onClose={onClose}
      title={tokens.length === 1 ? "Send them their link" : "Send them their links"}
      panelClassName="max-w-md"
    >
      <ul className="flex flex-col gap-2">
        {tokens.map((token, i) => {
          const url = `${origin}/s/${token}`;
          return (
            <li
              key={token}
              className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">New person {i + 1}</span>
                <span className="block truncate text-xs text-[var(--ink-muted)]">{url.replace(/^https?:\/\//, "")}</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  void shareViaSheet({ text: SEAT_TEXT, url }).then((shared) => {
                    if (!shared) setSharing(url);
                  })
                }
                className="shrink-0 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-xs font-bold text-[var(--ink)]"
              >
                Share
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-[var(--ink-muted)]">Links last 48 hours.</p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-1.5 text-sm font-bold text-[var(--bg)]"
        >
          Done
        </button>
      </div>
    </Modal>
      {sharing ? (
        <SharePopup
          open
          onClose={() => setSharing(null)}
          title="Send their link"
          url={sharing}
          text={SEAT_TEXT}
        />
      ) : null}
    </>
  );
}
