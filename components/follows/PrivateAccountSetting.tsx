"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Settings row: switch the account to private (approve followers). */
export function PrivateAccountSetting() {
  const privacy = useQuery(api.follows.getMyPrivacy, {});
  const setPrivate = useMutation(api.follows.setPrivate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!privacy) return null;
  const on = privacy.isPrivate;

  return (
    <div className="min-w-0 border-t border-[var(--ink-soft)] pt-5">
      <div className="flex items-center justify-between gap-4">
        <span id="settings-private-label" className="text-sm text-[var(--ink-muted)]">
          Private account
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="settings-private-label"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await setPrivate({ isPrivate: !on });
            } catch {
              setError("Could not save that — try again.");
            } finally {
              setBusy(false);
            }
          }}
          className={`relative h-8 w-14 shrink-0 rounded-full border-[2px] border-[var(--ink)] transition-colors disabled:opacity-60 ${
            on ? "bg-[var(--accent)]" : "bg-[var(--paper)]"
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full transition-transform ${
              on ? "translate-x-6 bg-[var(--accent-ink)]" : "translate-x-0 bg-[var(--ink)]"
            }`}
          />
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
