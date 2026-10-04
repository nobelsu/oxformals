"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOnChange } from "@/lib/hooks/useOnChange";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { MessagesTab } from "@/components/chat/MessagesTab";
import { CollegesTab } from "@/components/colleges/CollegesTab";
import { FeedTab } from "@/components/feed/FeedTab";
import { BrowseTab } from "@/components/swap/BrowseTab";
import { MineTab } from "@/components/swap/MineTab";
import { ListFormalModal } from "@/components/swap/ListFormalModal";
import { SignInGate } from "@/components/swap/SignInGate";

const TABS = ["feed", "browse", "colleges", "chats", "mine"] as const;
type Tab = (typeof TABS)[number];

function isTab(x: string | null): x is Tab {
  return !!x && (TABS as readonly string[]).includes(x);
}

export function HomeClient() {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

  const [tab, setTab] = useState<Tab>(isTab(urlTab) ? urlTab : "feed");

  // The URL is the source of truth: follow it whenever the tab param changes.
  useOnChange(urlTab ?? "", () => setTab(isTab(urlTab) ? urlTab : "feed"));

  const setActiveTab = useCallback(
    (next: Tab, options?: { openListFormal?: boolean }) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "feed") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      if (options?.openListFormal) {
        params.set("openList", "1");
      } else {
        params.delete("openList");
      }
      if (next !== "mine") {
        params.delete("edit");
      }
      const qs = params.toString();
      // Shallow: `/` is server-rendered per request, so router.replace would
      // wait on a round trip before the tab changed.
      window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
    },
    [searchParams],
  );

  // The old "Your formals" hub now lives in the feed; send its links there.
  useEffect(() => {
    if (urlTab === "requests") router.replace("/");
  }, [urlTab, router]);

  // `?openList=1` opens the "List a formal" form over whichever tab you're on.
  const listFormalOpen = searchParams.get("openList") === "1";
  const closeListFormal = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openList");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [searchParams]);

  const content = useMemo(() => {
    // The logged-out marketing landing is server-rendered in app/page.tsx; by
    // the time HomeClient mounts we are either signed in or on a tab/deep-link.
    if (tab === "browse") {
      return (
        <BrowseTab
          onNavigateToMine={() => setActiveTab("mine")}
          onNavigateToRequests={() =>
            setActiveTab("browse", { openListFormal: true })
          }
          onSignInRequired={() => router.push("/login?next=/")}
        />
      );
    }
    if (tab === "colleges") {
      return <CollegesTab />;
    }
    // Same hydration rule as the landing branch above: `isAuthenticated` is
    // false while auth resolves, so gating on it alone flashes the sign-in wall
    // at users who are already signed in.
    if (status !== "ready") return null;
    if (!isAuthenticated) {
      return <SignInGate />;
    }
    if (tab === "feed") {
      return <FeedTab />;
    }
    if (tab === "chats") {
      return <MessagesTab />;
    }
    if (tab === "mine") {
      return <MineTab />;
    }
    return null;
  }, [tab, status, isAuthenticated, setActiveTab, router]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 px-4 py-8 sm:px-6">
      {content}
      <ListFormalModal open={listFormalOpen} onClose={closeListFormal} />
    </main>
  );
}
