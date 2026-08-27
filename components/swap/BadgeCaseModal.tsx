"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SketchLock } from "@/components/ui/SketchLock";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
  TOTAL_BADGE_COUNT,
  badgeById,
  type BadgeDefinition,
} from "@/lib/data/badges";

type Props = {
  open: boolean;
  onClose: () => void;
  earned: Array<{ badgeId: string; earnedAt: number }> | undefined;
};

function formatEarnedDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BadgeCircle({
  def,
  earnedAt,
  selected,
  onSelect,
}: {
  def: BadgeDefinition;
  earnedAt?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={def.name}
      aria-pressed={selected}
      className={`flex min-w-0 w-full cursor-pointer flex-col items-center gap-0.5 rounded-lg p-1 transition-colors ${
        selected
          ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
          : "hover:bg-[var(--paper)]"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-sm text-[var(--ink)] sm:h-9 sm:w-9 ${
          earnedAt === undefined ? "border-dashed opacity-55" : ""
        }`}
      >
        {earnedAt === undefined ? (
          <SketchLock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        ) : (
          def.icon
        )}
      </span>
      <span
        className={`w-full truncate text-center text-[0.58rem] leading-tight ${
          earnedAt === undefined
            ? "text-[var(--ink-muted)]"
            : "text-[var(--ink)]"
        }`}
      >
        {def.name}
      </span>
    </button>
  );
}

/** Full badge case: milestone + college sections, earned vs locked, detail line. */
export function BadgeCaseModal({ open, onClose, earned }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const earnedMap = new Map((earned ?? []).map((e) => [e.badgeId, e.earnedAt]));
  const selected = selectedId ? badgeById(selectedId) : undefined;
  const selectedEarnedAt = selectedId ? earnedMap.get(selectedId) : undefined;
  const collegeEarned = COLLEGE_BADGES.filter((b) => earnedMap.has(b.id)).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Badges"
      compact
      panelClassName="!max-w-2xl"
    >
      <p className="-mt-1 mb-3 text-[0.8rem] text-[var(--ink-muted)]">
        {earnedMap.size} of {TOTAL_BADGE_COUNT} earned
      </p>

      <section>
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Milestones
        </h3>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(3.35rem,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(4.1rem,1fr))]">
          {MILESTONE_BADGES.map((def) => (
            <BadgeCircle
              key={def.id}
              def={def}
              earnedAt={earnedMap.get(def.id)}
              selected={selectedId === def.id}
              onSelect={() =>
                setSelectedId((cur) => (cur === def.id ? null : def.id))
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-3">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Colleges · {collegeEarned} of {COLLEGE_BADGES.length}
        </h3>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(3.35rem,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(4.1rem,1fr))]">
          {COLLEGE_BADGES.map((def) => (
            <BadgeCircle
              key={def.id}
              def={def}
              earnedAt={earnedMap.get(def.id)}
              selected={selectedId === def.id}
              onSelect={() =>
                setSelectedId((cur) => (cur === def.id ? null : def.id))
              }
            />
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 mt-3 bg-[var(--paper)] pt-2">
        {selected ? (
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-2.5">
            <p className="text-sm font-bold text-[var(--accent)]">
              {selected.icon} {selected.name}
              {selectedEarnedAt !== undefined
                ? ` — earned ${formatEarnedDate(selectedEarnedAt)}`
                : ""}
            </p>
            <p className="mt-0.5 text-[0.8rem] text-[var(--ink-muted)]">
              {selected.description}
            </p>
          </div>
        ) : (
          <p className="text-center text-[0.8rem] text-[var(--ink-muted)]">
            Tap an earned badge to see when you got it.
          </p>
        )}
      </div>
    </Modal>
  );
}
