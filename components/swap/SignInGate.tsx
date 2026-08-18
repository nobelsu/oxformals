"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SketchCard } from "@/components/ui/SketchCard";

type Props = {
  message?: string;
};

export function SignInGate({ message = "Sign in to continue." }: Props) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const nextPath = tab ? `${pathname}?tab=${tab}` : pathname;
  const href = `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <SketchCard
      seed={1}
      className="flex min-h-[58vh] items-center justify-center p-6 sm:p-8 md:min-h-[62vh] md:p-10"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <h2 className="font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">
          {message}
        </h2>

        <p className="mt-5 max-w-md text-xs text-[var(--ink-soft)] sm:text-sm">
          Takes under a minute: email + a couple of details.
        </p>

        <div className="mt-9 flex w-full max-w-sm flex-col items-center gap-3">
          <Link
            href={href}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[var(--accent-ink)] shadow-[0_6px_14px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:translate-y-0"
          >
            Sign in
          </Link>
        </div>
      </div>
    </SketchCard>
  );
}
