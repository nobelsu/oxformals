const STEPS = [
  {
    title: "List your formal",
    body: "Post a seat at your college — a swap, or a paid guest place.",
  },
  {
    title: "Request a seat",
    body: "Ask to swap yours for theirs, or just take an open place.",
  },
  {
    title: "Go somewhere new",
    body: "Meet your host, eat, then rate the hall you visited.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="border-t-[2px] border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] py-10">
      <h2 className="font-display text-3xl uppercase tracking-wide">
        How it works
      </h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-5"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-wash)] text-sm font-bold text-[var(--accent-wash-ink)]">
              {index + 1}
            </span>
            <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
