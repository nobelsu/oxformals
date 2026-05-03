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
    <SketchCard seed={1} className="p-10 flex flex-col items-center gap-4 text-center">
      <h2 className="font-display text-3xl uppercase tracking-wide">{message}</h2>
      <p className="text-[var(--ink-muted)] max-w-sm">
        Takes a few seconds — just your email and a couple of details.
      </p>
      <Link
        href={href}
        className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2 text-sm transition-colors"
      >
        Sign in
      </Link>
    </SketchCard>
  );
}
