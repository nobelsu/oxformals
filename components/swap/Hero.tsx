"use client";

import type { ReactNode } from "react";

type Props = {
  footer?: ReactNode;
};

export function Hero({ footer }: Props) {
  return (
    <section className="flex flex-col items-center gap-6 text-center py-6">
      <h1 className="font-display text-7xl sm:text-8xl uppercase tracking-wider leading-none">
        oxformals
      </h1>
      <p className="mb-3 px-4 text-center text-lg text-[var(--ink-muted)] text-balance">
        Browse formals, request a seat, and go somewhere new.
      </p>
      {footer}
    </section>
  );
}
