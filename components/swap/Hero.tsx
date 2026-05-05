"use client";

type Props = {
  onList: () => void;
};

export function Hero({ onList }: Props) {
  return (
    <section className="flex flex-col items-center gap-4 text-center py-4">
      <h1 className="font-display text-7xl sm:text-8xl uppercase tracking-wider leading-none">
        oxformals
      </h1>
      <p className="max-w-full whitespace-nowrap text-center text-lg text-[var(--ink-muted)]">
        Browse open swaps, request a seat, and go somewhere new.
      </p>
      <button
        type="button"
        onClick={onList}
        className="mt-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2.5 text-base transition-colors"
      >
        + List my formal
      </button>
    </section>
  );
}
