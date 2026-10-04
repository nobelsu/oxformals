"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ensureWebPushSubscription, webPushSupported } from "@/lib/push/webPush";

const DISMISSED_KEY = "oxformals.alertsPrompt.dismissed";

function shouldHide(): boolean {
  if (!webPushSupported()) return true;
  if (Notification.permission !== "default") return true;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Turn on alerts?" at the top of the panel, once the person has something
 * worth being alerted about. Never shown on page load: the panel only opens
 * when they tap the bell.
 */
export function AlertsPrompt({ eligible }: { eligible: boolean }) {
  const save = useMutation(api.notifications.saveWebPushSubscription);
  const [hidden, setHidden] = useState(shouldHide);
  const [busy, setBusy] = useState(false);
  if (!eligible || hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: it'll ask again next time.
    }
    setHidden(true);
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      await ensureWebPushSubscription((sub) => save(sub), { prompt: true });
    } finally {
      setBusy(false);
      setHidden(true);
    }
  };

  return (
    <div className="mx-4 mb-3 mt-1 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--bg)] p-3.5">
      <p className="text-sm font-bold text-[var(--ink)]">Turn on alerts?</p>
      <p className="text-sm text-[var(--ink-muted)]">Know when someone wants your seat.</p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void turnOn()}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3.5 py-1 text-[13px] font-bold text-[var(--bg)] disabled:opacity-50"
        >
          Turn on
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-[13px] font-bold text-[var(--ink)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
