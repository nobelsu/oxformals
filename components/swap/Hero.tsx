"use client";

type Props = {
};

export function Hero({}: Props) {
  return (
    <section className="flex flex-col items-center gap-4 text-center py-4">
      <h1 className="font-display text-7xl sm:text-8xl uppercase tracking-wider leading-none">
        oxformals
      </h1>
      <p className="max-w-[20ch] sm:max-w-full text-center text-lg text-[var(--ink-muted)] text-balance">
        Browse formals, request a seat, and go somewhere new.
      </p>
    </section>
  );
}
