"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
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
      className={`flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl p-1.5 transition-colors ${
        selected ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" : "hover:bg-[var(--paper)]"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-lg ${
          earnedAt === undefined ? "border-dashed opacity-30" : ""
        }`}
      >
        {earnedAt === undefined ? "🔒" : def.icon}
      </span>
      <span
        className={`w-full truncate text-center text-[0.65rem] ${
          earnedAt === undefined ? "text-[var(--ink-muted)]" : "text-[var(--ink)]"
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Badges · ${earnedMap.size} of ${TOTAL_BADGE_COUNT}`}
      panelClassName="max-w-md"
    >
      <section>
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Milestones
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
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

      <section className="mt-5">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Colleges · {COLLEGE_BADGES.filter((b) => earnedMap.has(b.id)).length} of{" "}
          {COLLEGE_BADGES.length}
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
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

      {selected ? (
        <div className="mt-5 rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3">
          <p className="text-sm font-bold text-[var(--accent)]">
            {selected.icon} {selected.name}
            {selectedEarnedAt !== undefined
              ? ` — earned ${formatEarnedDate(selectedEarnedAt)}`
              : ""}
          </p>
          <p className="mt-0.5 text-[0.85rem] text-[var(--ink-muted)]">
            {selected.description}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-center text-[0.8rem] text-[var(--ink-muted)]">
          Tap an earned badge to see when you got it.
        </p>
      )}
    </Modal>
  );
}
