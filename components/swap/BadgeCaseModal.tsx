"use client";

import { useState } from "react";
import { BadgeArt } from "@/components/badges/BadgeArt";
import { Modal } from "@/components/ui/Modal";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
  TOTAL_BADGE_COUNT,
  badgeById,
  type BadgeDefinition,
  type BadgeMetric,
  type MilestoneBadgeDefinition,
} from "@/lib/data/badges";

type Props = {
  open: boolean;
  onClose: () => void;
  earned: Array<{ badgeId: string; earnedAt: number }> | undefined;
  /** Counts behind the ladders; undefined while loading. */
  progress?: { formals: number; reviews: number };
};

function formatEarnedDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const METRIC_LABEL: Record<BadgeMetric, { title: string; unit: string }> = {
  formals: { title: "Formals", unit: "formal" },
  reviews: { title: "Reviews", unit: "review" },
};

/** One progress track: 1 → 5 → 10 (→ 25), medals on a line. */
function Ladder({
  metric,
  count,
  earnedMap,
  selectedId,
  onSelect,
}: {
  metric: BadgeMetric;
  count: number | undefined;
  earnedMap: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const steps = MILESTONE_BADGES.filter((b) => b.metric === metric);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
        {METRIC_LABEL[metric].title}
        {count !== undefined ? ` · ${count}` : ""}
      </p>
      <div className="relative flex items-start justify-between">
        <span
          aria-hidden
          className="absolute left-7 right-7 top-7 h-[2px] -translate-y-1/2 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
        />
        {steps.map((def) => (
          <button
            key={def.id}
            type="button"
            onClick={() => onSelect(def.id)}
            aria-pressed={selectedId === def.id}
            className={`relative flex w-20 cursor-pointer flex-col items-center gap-1.5 rounded-xl py-1 transition-colors ${
              selectedId === def.id ? "bg-[var(--bg)]" : ""
            }`}
          >
            <BadgeArt def={def} earned={earnedMap.has(def.id)} size={56} />
            <span
              className={`text-center text-[0.75rem] leading-tight ${
                earnedMap.has(def.id) ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"
              }`}
            >
              {def.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** What a tapped badge means: when it was earned, or how far off it is. */
function Detail({
  def,
  earnedAt,
  progress,
}: {
  def: BadgeDefinition;
  earnedAt: number | undefined;
  progress: Props["progress"];
}) {
  const earned = earnedAt !== undefined;
  let status: string;
  let ratio: number | null = null;
  if (earned) {
    status = `${def.description} · earned ${formatEarnedDate(earnedAt)}`;
  } else if (def.family === "milestone") {
    const m = def as MilestoneBadgeDefinition;
    const have = progress?.[m.metric];
    if (have === undefined) {
      status = def.description;
    } else {
      const left = Math.max(0, m.threshold - have);
      const unit = METRIC_LABEL[m.metric].unit;
      status = `${left} more ${unit}${left === 1 ? "" : "s"} to go`;
      ratio = Math.min(1, have / m.threshold);
    }
  } else {
    status = `Attend a formal at ${def.college}`;
  }

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border-[2px] p-4 ${
        earned
          ? "border-[var(--ink)] bg-[var(--bg)]"
          : "border-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
      }`}
    >
      <BadgeArt def={def} earned={earned} size={56} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-tight">{def.name}</p>
        <p className="text-sm text-[var(--ink-muted)]">{status}</p>
        {ratio !== null ? (
          <div className="mt-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
            <div
              className="h-2 rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Full badge case: milestone ladders, college stamps, and a detail card. */
export function BadgeCaseModal({ open, onClose, earned, progress }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const earnedMap = new Map((earned ?? []).map((e) => [e.badgeId, e.earnedAt]));
  const selected = selectedId ? badgeById(selectedId) : undefined;
  const collegeEarned = COLLEGE_BADGES.filter((b) => earnedMap.has(b.id)).length;
  const toggle = (id: string) =>
    setSelectedId((cur) => (cur === id ? null : id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Badges"
      compact
      panelClassName="!max-w-2xl"
    >
      <p className="-mt-1 mb-4 text-[0.8rem] text-[var(--ink-muted)]">
        {earnedMap.size} of {TOTAL_BADGE_COUNT} earned
      </p>

      <section className="flex flex-col gap-5">
        <Ladder
          metric="formals"
          count={progress?.formals}
          earnedMap={earnedMap}
          selectedId={selectedId}
          onSelect={toggle}
        />
        <Ladder
          metric="reviews"
          count={progress?.reviews}
          earnedMap={earnedMap}
          selectedId={selectedId}
          onSelect={toggle}
        />
      </section>

      <section className="mt-6">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Colleges · {collegeEarned} of {COLLEGE_BADGES.length}
        </h3>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-2 gap-y-4">
          {COLLEGE_BADGES.map((def) => {
            const has = earnedMap.has(def.id);
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => toggle(def.id)}
                aria-pressed={selectedId === def.id}
                title={def.name}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl py-1 transition-colors ${
                  selectedId === def.id ? "bg-[var(--bg)]" : ""
                }`}
              >
                <BadgeArt def={def} earned={has} size={60} />
                <span
                  className={`max-w-[5.5rem] text-center text-[0.72rem] leading-tight ${
                    has ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"
                  }`}
                >
                  {def.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-0 mt-4 bg-[var(--paper)] pt-3">
        {selected ? (
          <Detail
            def={selected}
            earnedAt={earnedMap.get(selected.id)}
            progress={progress}
          />
        ) : (
          <p className="text-center text-[0.8rem] text-[var(--ink-muted)]">
            Tap a badge to see what it takes.
          </p>
        )}
      </div>
    </Modal>
  );
}
