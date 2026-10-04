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
type Outcome = "on" | "blocked" | "failed";

const OUTCOME_COPY: Record<Outcome, { title: string; body: string }> = {
  on: {
    title: "Alerts are on",
    body: "This browser will tell you when someone wants your seat.",
  },
  blocked: {
    title: "Alerts are blocked",
    body: "Allow notifications for Oxformals in your browser's site settings, then try again.",
  },
  failed: {
    title: "Couldn't turn alerts on",
    body: "Your browser didn't finish setting them up. Try again in a moment.",
  },
};

/** Give up on a browser that never finishes subscribing. */
const SUBSCRIBE_TIMEOUT_MS = 15_000;

export function AlertsPrompt({ eligible }: { eligible: boolean }) {
  const save = useMutation(api.notifications.saveWebPushSubscription);
  const [hidden, setHidden] = useState(shouldHide);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
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
    setOutcome(null);
    try {
      await Promise.race([
        ensureWebPushSubscription((sub) => save(sub), {
          prompt: true,
          // Say so the moment the browser answers; subscribing carries on behind.
          onPermission: (permission) => {
            if (permission === "granted") setOutcome("on");
            else if (permission === "denied") setOutcome("blocked");
            setBusy(false);
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), SUBSCRIBE_TIMEOUT_MS),
        ),
      ]);
    } catch {
      setOutcome("failed");
    } finally {
      setBusy(false);
    }
  };

  const cardCls =
    "mx-4 mb-3 mt-1 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--bg)] p-3.5";
  const quietBtn =
    "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-[13px] font-bold text-[var(--ink)]";

  if (outcome) {
    return (
      <div className={cardCls} role="status">
        <p className="text-sm font-bold text-[var(--ink)]">{OUTCOME_COPY[outcome].title}</p>
        <p className="text-sm text-[var(--ink-muted)]">{OUTCOME_COPY[outcome].body}</p>
        <div className="mt-2.5 flex gap-2">
          {outcome === "failed" ? (
            <button type="button" onClick={() => void turnOn()} className={quietBtn}>
              Try again
            </button>
          ) : null}
          <button type="button" onClick={() => setHidden(true)} className={quietBtn}>
            {outcome === "on" ? "Done" : "Close"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cardCls}>
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
        <button type="button" onClick={dismiss} className={quietBtn}>
          Not now
        </button>
      </div>
    </div>
  );
}
