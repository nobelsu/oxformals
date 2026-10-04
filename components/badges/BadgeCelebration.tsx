"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { BadgeArt } from "@/components/badges/BadgeArt";
import { ShareButton } from "@/components/share/ShareButton";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { COLLEGE_BADGES, badgeById } from "@/lib/data/badges";

const TOAST_MS = 5000;

/**
 * Celebrates badges as they're earned, one at a time: milestones get a toast,
 * new colleges get a stamp pop-up with "Share to story". Each is marked seen
 * when it goes away, so it only shows once (across devices).
 */
export function BadgeCelebration() {
  const { user, isAuthenticated, needsRulesAgreement } = useAuth();
  const active = isAuthenticated && !!user && !needsRulesAgreement;
  const newBadges = useQuery(api.badges.getMyNewBadges, active ? {} : "skip");
  const earned = useQuery(
    api.badges.getUserBadges,
    active && user ? { userId: user.id as Id<"users"> } : "skip",
  );
  const markSeen = useMutation(api.badges.markBadgesSeen);
  const baselineSet = useRef(false);

  // First visit since this feature: don't replay every badge ever earned.
  useEffect(() => {
    if (newBadges?.needsBaseline && !baselineSet.current) {
      baselineSet.current = true;
      void markSeen({ upTo: Date.now() });
    }
  }, [newBadges?.needsBaseline, markSeen]);

  const current = newBadges?.badges[0];
  const def = current ? badgeById(current.badgeId) : undefined;
  const isMilestone = def?.family === "milestone";

  useEffect(() => {
    if (!current || !isMilestone) return;
    const t = window.setTimeout(
      () => void markSeen({ upTo: current.earnedAt }),
      TOAST_MS,
    );
    return () => window.clearTimeout(t);
  }, [current, isMilestone, markSeen]);

  if (!current || !def || !user) return null;
  const dismiss = () => void markSeen({ upTo: current.earnedAt });

  if (def.family === "milestone") {
    return (
      <div
        role="status"
        className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2"
      >
        <button
          type="button"
          onClick={dismiss}
          className="flex cursor-pointer items-center gap-3 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] py-2 pl-2 pr-5 text-left shadow-[4px_4px_0_var(--ink)]"
        >
          <BadgeArt def={def} earned size={40} />
          <span>
            <span className="block text-xs uppercase tracking-widest text-[var(--accent)]">
              Badge earned
            </span>
            <span className="block font-semibold text-[var(--ink)]">
              {def.name}
            </span>
          </span>
        </button>
      </div>
    );
  }

  if (def.family === "special") {
    return (
      <Modal open onClose={dismiss} compact panelClassName="!max-w-sm">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <BadgeArt def={def} earned size={120} />
          <p className="mt-3 font-display text-3xl">{def.name}</p>
          <p className="text-sm text-[var(--ink-muted)]">
            You were here from the start. Thanks for being one of the first.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 cursor-pointer rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            Nice
          </button>
        </div>
      </Modal>
    );
  }

  const collegesVisited = (earned ?? []).filter((b) =>
    b.badgeId.startsWith("college-"),
  ).length;
  return (
    <Modal open onClose={dismiss} compact panelClassName="!max-w-sm">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <BadgeArt def={def} earned size={120} />
        <p className="mt-2 font-display text-3xl">New college stamped!</p>
        <p className="text-sm text-[var(--ink-muted)]">
          {def.name}
          {collegesVisited > 0
            ? ` · that's ${collegesVisited} of ${COLLEGE_BADGES.length} colleges.`
            : ""}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <ShareButton
            kind="badge"
            id={`${user.id}~${def.id}`}
            variant="pill"
          />
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            Nice
          </button>
        </div>
      </div>
    </Modal>
  );
}
