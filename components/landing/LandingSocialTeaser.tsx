export function LandingSocialTeaser() {
  return (
    <section className="grid items-center gap-8 border-t-[2px] border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] py-10 md:grid-cols-2">
      <div>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Follow people, not just formals
        </h2>
        <p className="mt-3 max-w-[44ch] text-base leading-relaxed text-[var(--ink-muted)]">
          See where the people you follow have eaten, what they thought of it,
          and get told when someone lists a formal at a college on your
          wishlist.
        </p>
      </div>

      <div className="flex flex-col gap-3" aria-hidden>
        <div className="rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent)] text-[0.7rem] font-bold text-[var(--accent-ink)]">
              SA
            </span>
            <span>
              <b>Sasa</b> reviewed <b>Worcester</b>
            </span>
          </div>
          <p className="mt-2 text-sm italic text-[var(--ink-muted)]">
            &ldquo;Best hall of the term — go for the guest night if you can get
            one.&rdquo;
          </p>
        </div>
        <div className="rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent)] text-[0.7rem] font-bold text-[var(--accent-ink)]">
              JO
            </span>
            <span>
              <b>Jonah</b> listed a formal at <b>Magdalen</b>
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            On your wishlist &middot; 3 seats left &middot; 20 Oct
          </p>
        </div>
      </div>
    </section>
  );
}
