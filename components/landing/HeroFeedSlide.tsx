const FEED = [
  {
    who: "SA",
    line: "Sasa reviewed Worcester",
    body: "“Best hall of the term — go for the guest night if you can get one.”",
    italic: true,
  },
  {
    who: "JO",
    line: "Jonah listed a formal at Magdalen",
    body: "On your wishlist · 3 seats left · 20 Oct",
    italic: false,
  },
  {
    who: "PR",
    line: "Priya is going to St Hugh’s",
    body: "With 2 people you follow",
    italic: false,
  },
];

/** Static preview of the social feed for the hero. Not live — the feed is unbuilt. */
export function HeroFeedSlide() {
  return (
    <ul className="flex flex-col gap-2 pt-1" aria-hidden>
      {FEED.map((f) => (
        <li
          key={f.line}
          className="rounded-[12px] border border-[color-mix(in_srgb,var(--ink)_14%,transparent)] p-3"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent-wash)] text-[0.7rem] font-semibold text-[var(--accent-wash-ink)]">
              {f.who}
            </span>
            <span className="text-[0.95rem] leading-snug">{f.line}</span>
          </div>
          <p
            className={`mt-1.5 text-[0.9rem] text-[var(--ink-muted)] ${f.italic ? "italic" : ""}`}
          >
            {f.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
