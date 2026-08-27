"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { UnreadBadge } from "@/components/chat/UnreadBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Drawer } from "@/components/ui/Drawer";
import { api } from "@/convex/_generated/api";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import { useAuth } from "./auth/useAuth";

function useNavTheme() {
  const [inverted, setInverted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const check = () => {
      const navRect = nav.getBoundingClientRect();
      const midY = navRect.top + navRect.height / 2;
      const midX = navRect.left + navRect.width / 2;
      nav.style.setProperty("pointer-events", "none", "important");
      nav.style.visibility = "hidden";
      const el = document.elementFromPoint(midX, midY);
      nav.style.removeProperty("pointer-events");
      nav.style.visibility = "";
      if (!el) return;

      const inFinale = !!el.closest("[data-nav-hide]");
      setHidden(inFinale);
      if (inFinale) return;

      let r = 0, g = 0, b = 0;
      let found = false;

      if (el instanceof HTMLCanvasElement) {
        try {
          const rect = el.getBoundingClientRect();
          const scaleX = el.width / rect.width;
          const scaleY = el.height / rect.height;
          const cx = (midX - rect.left) * scaleX;
          const cy = (midY - rect.top) * scaleY;
          const ctx2d = el.getContext("2d");
          if (ctx2d) {
            const px = ctx2d.getImageData(Math.round(cx), Math.round(cy), 1, 1).data;
            if (px[3] > 20) {
              r = px[0]; g = px[1]; b = px[2];
              found = true;
            }
          }
        } catch { /* tainted canvas or other error — fall through */ }
      }

      if (!found) {
        let target: Element | null = el instanceof HTMLCanvasElement ? el.parentElement : el;
        while (target) {
          const bg = getComputedStyle(target).backgroundColor;
          if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
            const match = bg.match(/\d+/g);
            if (match) {
              [r, g, b] = match.map(Number);
              found = true;
            }
            break;
          }
          target = target.parentElement;
        }
      }

      if (!found) return;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      setInverted(luminance < 0.5);
    };

    check();
    const id = setInterval(check, 80);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      clearInterval(id);
      window.removeEventListener("scroll", check);
    };
  }, []);

  return { navRef, inverted, hidden };
}

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "browse", label: "Browse" },
  { id: "colleges", label: "Colleges" },
  { id: "requests", label: "Activity" },
  { id: "chats", label: "Chats" },
] as const;

/** Labels for tabs that live behind other entry points (e.g. the avatar) and
 *  so aren't in the visible tab bar, but still need a mobile header title. */
const OFF_BAR_LABELS: Record<string, string> = { mine: "Me" };

export function Nav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/letter")) {
    return null;
  }

  return (
    <Suspense fallback={<NavShell />}>
      <NavInner />
    </Suspense>
  );
}

function NavShell() {
  return (
    <nav className="sticky top-0 z-50 w-full shrink-0 backdrop-blur-md bg-[var(--bg)]/80">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5" />
    </nav>
  );
}

function NavInner() {
  const { status, isAuthenticated, user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [landingScrolled, setLandingScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRequestsDetail = pathname?.startsWith("/requests/") ?? false;
  const isCollegeDetail = pathname?.startsWith("/college/") ?? false;
  const isLegalPage =
    pathname?.startsWith("/privacy") || pathname?.startsWith("/terms");
  const isLoginPage = pathname?.startsWith("/login") ?? false;
  const isBareRoot =
    pathname === "/" && !searchParams.get("tab") && !searchParams.get("listing");
  const activeTab = isRequestsDetail
    ? "requests"
    : isCollegeDetail
      ? "colleges"
      : searchParams.get("tab") ?? "feed";
  // Mirrors HomeClient's landing-page condition: logged-out visitors on "/"
  // with no ?tab= and no ?listing= (email deep links bypass landing) see the
  // marketing page, not BrowseTab, so Browse shouldn't be marked active
  // there. Gate on `status === "ready"` too — isAuthenticated is false while
  // auth is still hydrating, which previously made this flip true for
  // signed-in users too and caused the Browse highlight to flicker in on
  // hydration instead of showing immediately.
  const isLandingPage =
    isBareRoot &&
    status === "ready" &&
    !isAuthenticated;

  const onTabbedPage = (pathname === "/" && !isLandingPage) || isRequestsDetail;
  const activeTabLabel =
    TABS.find((t) => t.id === activeTab)?.label ??
    OFF_BAR_LABELS[activeTab] ??
    "Browse";
  const totalUnread =
    useQuery(
      api.chat.getTotalUnreadCount,
      isAuthenticated ? {} : "skip",
    ) ?? 0;

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isLandingPage) {
      setLandingScrolled(false);
      return;
    }

    const onScroll = () => {
      setLandingScrolled(window.scrollY > 56);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLandingPage]);

  const { navRef, inverted, hidden } = useNavTheme();

  if (isLoginPage) {
    return (
      <nav className="sticky top-0 z-50 w-full shrink-0 relative isolate backdrop-blur-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-bg/95 via-bg/70 to-transparent"
        />
        <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex items-center justify-start">
              <Link
                href="/"
                className="font-display text-xl uppercase leading-none tracking-[0.12em] text-[var(--nav-ink)]"
              >
                Oxformals
              </Link>
            </div>
            <div className="col-start-2 flex items-center justify-center gap-4 whitespace-nowrap text-sm text-[var(--nav-ink-muted)]">
              <Link
                href="/privacy"
                className="underline-offset-4 transition-colors hover:text-[var(--nav-ink)] hover:underline"
              >
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link
                href="/terms"
                className="underline-offset-4 transition-colors hover:text-[var(--nav-ink)] hover:underline"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (isLegalPage) {
    return (
      <nav
        ref={navRef}
        className={`sticky top-0 z-50 w-full shrink-0 transition-[colors,opacity] duration-300 ${
          hidden
            ? "pointer-events-none opacity-0"
            : inverted
              ? "nav-inverted pointer-events-none"
              : "relative isolate backdrop-blur-md"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-bg/95 via-bg/70 to-transparent"
        />
        <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex items-center justify-start">
              <Link
                href="/"
                className="font-display text-xl uppercase leading-none tracking-[0.12em] text-[var(--nav-ink)]"
              >
                Oxformals
              </Link>
            </div>
            <div className="flex items-center justify-center whitespace-nowrap text-sm text-[var(--nav-ink-muted)]">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-[var(--nav-ink)] hover:underline"
              >
                <span aria-hidden>←</span>
                Return
              </Link>
            </div>
            <div className="flex items-center justify-end">
              <Link
                href="/login"
                className="rounded-full bg-[var(--accent)] px-4 py-1 font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (isLandingPage) {
    return (
      <nav
        ref={navRef}
        className={`sticky top-0 z-50 w-full shrink-0 transition-[colors,opacity] duration-300 ${
          hidden
            ? "pointer-events-none opacity-0"
            : inverted
              ? "nav-inverted pointer-events-none"
              : "relative isolate backdrop-blur-md"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-bg/95 via-bg/70 to-transparent"
        />
        <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center">
            <div
              className={`col-start-2 flex items-center justify-center gap-5 whitespace-nowrap text-sm text-[var(--nav-ink-muted)] transition-all duration-300 ${
                landingScrolled
                  ? "pointer-events-none -translate-y-1 opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
              <Link
                href="/privacy"
                className="underline-offset-4 transition-colors hover:text-[var(--nav-ink)] hover:underline"
              >
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link
                href="/terms"
                className="underline-offset-4 transition-colors hover:text-[var(--nav-ink)] hover:underline"
              >
                Terms
              </Link>
            </div>
            <div
              className={`absolute top-1/2 z-10 transition-[left,transform] duration-300 ease-out ${
                landingScrolled
                  ? "left-1/2 -translate-x-1/2 -translate-y-1/2 scale-110"
                  : "left-0 -translate-y-1/2"
              }`}
            >
              <Link
                href="/"
                className="block font-display text-xl uppercase leading-none tracking-[0.12em] text-[var(--nav-ink)] transition-transform duration-300 ease-out"
              >
                Oxformals
              </Link>
            </div>
            <div className="col-start-3 flex items-center justify-end">
              <Link
                href="/login"
                className="rounded-full bg-[var(--accent)] px-4 py-1 font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }


  // Logged-out visitors who followed "Browse formals" off the landing page get
  // a stripped-back nav (brand · Return · Sign in) instead of the full tab bar —
  // the tabs are useless to them, and Return takes them back to the marketing
  // page, mirroring the legal-page nav.
  if (
    onTabbedPage &&
    status === "ready" &&
    !isAuthenticated &&
    activeTab === "browse"
  ) {
    return (
      <nav
        ref={navRef}
        className={`sticky top-0 z-50 w-full shrink-0 transition-[colors,opacity] duration-300 ${
          hidden
            ? "pointer-events-none opacity-0"
            : inverted
              ? "nav-inverted pointer-events-none"
              : "backdrop-blur-md bg-[var(--nav-bg)]/80"
        }`}
      >
        <div className="pointer-events-auto mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4 py-5 sm:px-6">
          <div className="flex items-center justify-start">
            <Link
              href="/"
              className="font-display text-xl uppercase leading-none tracking-[0.12em] text-[var(--nav-ink)]"
            >
              Oxformals
            </Link>
          </div>
          <div className="flex items-center justify-center whitespace-nowrap text-sm text-[var(--nav-ink-muted)]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-[var(--nav-ink)] hover:underline"
            >
              <span aria-hidden>←</span>
              Return
            </Link>
          </div>
          <div className="flex items-center justify-end">
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent)] px-4 py-1 font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  function hrefFor(tab: string): string {
    if (tab === "feed") return "/";
    if (tab === "browse") return BROWSE_ROUTE;
    return `/?tab=${tab}`;
  }

  return (
    <nav ref={navRef} className={`sticky top-0 z-50 w-full shrink-0 transition-[colors,opacity] duration-300 ${hidden ? "pointer-events-none opacity-0" : inverted ? "nav-inverted pointer-events-none" : "backdrop-blur-md bg-[var(--nav-bg)]/80"}`}>
      <div className="pointer-events-auto mx-auto grid w-full max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-6">
        <div className="flex items-center justify-start">
          <Link
            href="/"
            className="hidden font-display text-xl uppercase leading-none tracking-[0.12em] text-[var(--nav-ink)] sm:block"
          >
            Oxformals
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--nav-ink)] text-[var(--nav-ink)] transition-colors hover:bg-[var(--nav-ink)] hover:text-[var(--nav-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)] sm:hidden"
            aria-label="Open menu"
            data-onboarding="menu"
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
          <p className="min-w-0 truncate text-center font-display text-lg uppercase tracking-[0.2em] text-[var(--nav-ink)] sm:hidden">
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
                  (isCollegeDetail && t.id === "colleges")
                }
                totalUnread={totalUnread}
              />
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 text-sm whitespace-nowrap sm:gap-3">
          {status !== "ready" ? null : isAuthenticated && user ? (
            <>
              <Link
                href="/?tab=mine"
                aria-label="Your profile"
                data-onboarding="me"
                aria-current={activeTab === "mine" ? "page" : undefined}
                className="group hidden min-w-0 items-center gap-2.5 rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)] sm:inline-flex"
              >
                <span className="min-w-0 truncate whitespace-nowrap text-[var(--nav-ink-muted)] group-hover:text-[var(--nav-ink)]">
                  {user.name.split(" ")[0]}
                  <span className="text-[var(--nav-ink-muted)]"> · {user.college}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full transition-shadow ${
                    activeTab === "mine"
                      ? "ring-2 ring-[var(--nav-ink)] ring-offset-2 ring-offset-[var(--nav-bg)]"
                      : ""
                  }`}
                >
                  <Avatar name={user.name} source={user.avatar} size="sm" />
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] px-4 py-1 font-medium"
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
                    (isCollegeDetail && t.id === "colleges")
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
              <Link
                href="/?tab=mine"
                onClick={() => setDrawerOpen(false)}
                data-onboarding="me"
                aria-current={activeTab === "mine" ? "page" : undefined}
                className="-mx-1 flex items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
              >
                <Avatar name={user.name} source={user.avatar} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-[var(--ink)]">
                    {user.name}
                  </span>
                  <span className="block truncate text-sm text-[var(--ink-muted)]">
                    {user.college} · View profile
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  void signOut().then(() => router.push("/"));
                }}
                className="w-full rounded-full border-[2px] border-[var(--ink)] px-4 py-2 text-left font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
              >
                Sign out
              </button>
            </div>
          ) : status === "ready" ? (
            <Link
              href="/login"
              onClick={() => setDrawerOpen(false)}
              className="block rounded-full bg-[var(--accent)] px-4 py-2 text-center font-medium text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
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
      data-onboarding={tab.id === "requests" ? "activity" : undefined}
      className={`inline-flex items-center gap-2 font-display uppercase tracking-[0.2em] whitespace-nowrap pb-0.5 transition-opacity ${
        isActive
          ? "text-[var(--nav-ink)]"
          : "text-[var(--nav-ink-muted)] hover:text-[var(--nav-ink)]"
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
      {showUnread ? (
        <UnreadBadge count={totalUnread} className="translate-y-px" />
      ) : null}
    </Link>
  );
}
