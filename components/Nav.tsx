"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { UnreadBadge } from "@/components/chat/UnreadBadge";
import { Drawer } from "@/components/ui/Drawer";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./auth/useAuth";
import { NavSettingsModal } from "./NavSettingsModal";

const TABS = [
  { id: "browse", label: "Browse" },
  { id: "rankings", label: "Rankings" },
  { id: "requests", label: "Activity" },
  { id: "chats", label: "Chats" },
  { id: "mine", label: "Me" },
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
    <nav className="w-full shrink-0 bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5" />
    </nav>
  );
}

function NavInner() {
  const { status, isAuthenticated, user, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRequestsDetail = pathname?.startsWith("/requests/") ?? false;
  const isCollegeDetail = pathname?.startsWith("/college/") ?? false;
  const activeTab = isRequestsDetail
    ? "requests"
    : isCollegeDetail
      ? "rankings"
      : searchParams.get("tab") ?? "browse";
  const onTabbedPage = pathname === "/" || isRequestsDetail;
  const activeTabLabel =
    TABS.find((t) => t.id === activeTab)?.label ?? "Browse";
  const totalUnread =
    useQuery(
      api.chat.getTotalUnreadCount,
      isAuthenticated ? {} : "skip",
    ) ?? 0;

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, searchParams]);

  function hrefFor(tab: string): string {
    if (tab === "browse") return "/";
    return `/?tab=${tab}`;
  }

  function openSettings() {
    setDrawerOpen(false);
    setSettingsOpen(true);
  }

  return (
    <nav className="w-full shrink-0 bg-[var(--bg)]">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-6">
        <div className="flex items-center justify-start">
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] sm:hidden"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="nav-drawer-panel"
            onClick={() => setDrawerOpen(true)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        <div className="flex min-w-0 items-center justify-center sm:col-start-2">
          <p className="min-w-0 truncate text-center font-display text-lg uppercase tracking-[0.2em] text-[var(--ink)] sm:hidden">
            {isCollegeDetail
              ? "Rankings"
              : onTabbedPage
                ? activeTabLabel
                : "Oxformals"}
          </p>
          <ul className="hidden min-w-0 max-w-full items-center justify-center gap-10 overflow-x-auto overflow-y-hidden sm:flex">
            {TABS.map((t) => (
              <NavTabLink
                key={t.id}
                tab={t}
                href={hrefFor(t.id)}
                isActive={
                  (onTabbedPage && activeTab === t.id) ||
                  (isCollegeDetail && t.id === "rankings")
                }
                totalUnread={totalUnread}
              />
            ))}
          </ul>
        </div>

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
                className="hidden whitespace-nowrap rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors sm:inline-block"
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

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Menu"
      >
        <div id="nav-drawer-panel" className="flex flex-col gap-8">
          <ul className="flex flex-col gap-1">
            {TABS.map((t) => (
              <li key={t.id}>
                <NavTabLink
                  tab={t}
                  href={hrefFor(t.id)}
                  isActive={
                    (onTabbedPage && activeTab === t.id) ||
                    (isCollegeDetail && t.id === "rankings")
                  }
                  totalUnread={totalUnread}
                  onNavigate={() => setDrawerOpen(false)}
                  className="block w-full rounded-lg px-3 py-3 text-left text-xl"
                />
              </li>
            ))}
          </ul>

          {status === "ready" && isAuthenticated && user ? (
            <div className="flex flex-col gap-4 border-t-[2px] border-[var(--ink)]/15 pt-6">
              <p className="text-sm text-[var(--ink-muted)]">
                {user.name}
                <span className="text-[var(--ink-soft)]"> · {user.college}</span>
              </p>
              <button
                type="button"
                onClick={openSettings}
                className="w-full rounded-full border-[2px] border-[var(--ink)] px-4 py-2 text-left text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  void signOut().then(() => router.push("/"));
                }}
                className="w-full rounded-full border-[2px] border-[var(--ink)] px-4 py-2 text-left text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
              >
                Sign out
              </button>
            </div>
          ) : status === "ready" ? (
            <Link
              href="/login"
              onClick={() => setDrawerOpen(false)}
              className="block rounded-full bg-[var(--accent)] px-4 py-2 text-center text-white hover:bg-[var(--accent-hover)]"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </Drawer>
    </nav>
  );
}

type NavTab = (typeof TABS)[number];

function NavTabLink({
  tab,
  href,
  isActive,
  totalUnread,
  onNavigate,
  className = "",
}: {
  tab: NavTab;
  href: string;
  isActive: boolean;
  totalUnread: number;
  onNavigate?: () => void;
  className?: string;
}) {
  const showUnread = tab.id === "chats" && totalUnread > 0;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`inline-flex items-center gap-2 font-display uppercase tracking-[0.2em] whitespace-nowrap pb-0.5 transition-opacity ${
        isActive
          ? "text-[var(--ink)]"
          : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
      } ${className}`}
    >
      <span
        className={
          isActive
            ? "underline underline-offset-[8px] decoration-[2.5px]"
            : undefined
        }
      >
        {tab.label}
      </span>
      {tab.id === "rankings" ? (
        <span
          className="rounded-full border border-[var(--accent)] px-1.5 py-px text-[0.55rem] font-semibold normal-case tracking-normal text-[var(--accent)]"
          aria-hidden="true"
        >
          new
        </span>
      ) : null}
      {showUnread ? (
        <UnreadBadge count={totalUnread} className="translate-y-px" />
      ) : null}
    </Link>
  );
}
