"use client";

import type { ReactNode } from "react";

type Props = {
  footer?: ReactNode;
};

export function Hero({ footer }: Props) {
  if (!footer) return null;
  return (
    <section className="flex flex-col items-center text-center">
      {footer}
    </section>
  );
}
