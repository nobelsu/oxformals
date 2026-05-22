"use client";

type Props = {
  isPast: boolean;
  canRate?: boolean;
};

export function ListingFormalBadges({ isPast, canRate }: Props) {
  if (!isPast) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--paper)_80%,var(--bg))] px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--ink)]">
        Completed
      </span>
      {canRate ? (
        <span className="rounded-full border-[2px] border-[var(--accent)] bg-[var(--accent)] px-2.5 py-0.5 text-[0.65rem] font-medium text-white">
          Rate formal
        </span>
      ) : null}
    </div>
  );
}
