const REVIEWS = [
  {
    who: "AM",
    name: "Amara",
    college: "Christ Church",
    score: "9.1",
    stars: 5,
    body: "“Candlelit hall, faultless service, and the port kept coming.”",
  },
  {
    who: "TO",
    name: "Tom",
    college: "Balliol",
    score: "7.8",
    stars: 4,
    body: "“Solid three courses, lively table. Book the early sitting.”",
  },
];

/** Static preview of the reviews surface for the hero. */
export function HeroReviewSlide() {
  return (
    <ul className="flex flex-col gap-2 pt-1" aria-hidden>
      {REVIEWS.map((r) => (
        <li
          key={r.name}
          className="rounded-[12px] border border-[color-mix(in_srgb,var(--ink)_14%,transparent)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent-wash)] text-[0.7rem] font-semibold text-[var(--accent-wash-ink)]">
                {r.who}
              </span>
              <span className="text-[0.95rem] leading-snug">
                <b>{r.name}</b> · {r.college}
              </span>
            </div>
            <span className="font-display text-lg leading-none text-[var(--ink)]">
              {r.score}
            </span>
          </div>
          <div
            className="mt-1.5 text-[0.9rem] tracking-wide text-[var(--accent)]"
            aria-label={`${r.stars} out of 5`}
          >
            {"★".repeat(r.stars)}
            <span className="text-[color-mix(in_srgb,var(--ink)_25%,transparent)]">
              {"★".repeat(5 - r.stars)}
            </span>
          </div>
          <p className="mt-1.5 text-[0.9rem] italic text-[var(--ink-muted)]">
            {r.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
