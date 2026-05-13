"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { NavSettingsModal } from "./NavSettingsModal";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
              <button
                type="button"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                aria-controls="nav-settings-panel"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
              <NavSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
              />
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
