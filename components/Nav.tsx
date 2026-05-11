"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "./auth/useAuth";

const TABS = [
  { id: "browse", label: "Browse" },
  { id: "requests", label: "Requests" },
  { id: "mine", label: "Mine" },
] as const;

export function Nav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) return null;

  return (
    <Suspense fallback={<NavShell />}>
      <NavInner />
    </Suspense>
  );
}

function NavShell() {
  return (
    <nav className="w-full bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5" />
    </nav>
  );
}

function NavInner() {
  const { status, isAuthenticated, user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRequestsDetail = pathname?.startsWith("/requests/") ?? false;
  const activeTab = isRequestsDetail
    ? "requests"
    : searchParams.get("tab") ?? "browse";
  const onTabbedPage = pathname === "/" || isRequestsDetail;

  function hrefFor(tab: string): string {
    if (tab === "browse") return "/";
    return `/?tab=${tab}`;
  }

  return (
    <nav className="w-full bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5 flex items-center justify-between gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <div className="hidden sm:block" />

        <ul className="flex min-w-0 max-w-full items-center justify-center gap-4 overflow-x-auto overflow-y-hidden sm:gap-10">
          {TABS.map((t) => {
            const isActive = onTabbedPage && activeTab === t.id;
            return (
              <li key={t.id}>
                <Link
                  href={hrefFor(t.id)}
                  className={`font-display uppercase tracking-[0.2em] text-lg sm:text-xl whitespace-nowrap pb-0.5 transition-opacity ${
                    isActive
                      ? "text-[var(--ink)] underline underline-offset-[8px] decoration-[2.5px]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-3 text-sm whitespace-nowrap">
          {status !== "ready" ? null : isAuthenticated && user ? (
            <>
              <span className="hidden sm:inline whitespace-nowrap text-[var(--ink-muted)]">
                {user.name.split(" ")[0]}
                <span className="text-[var(--ink-soft)]"> · {user.college}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => router.push("/"));
                }}
                className="whitespace-nowrap rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-1"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
