"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { MessagesTab } from "@/components/chat/MessagesTab";
import { RankingsTab } from "@/components/colleges/RankingsTab";
import { LandingPage } from "@/components/landing/LandingPage";
import { BrowseTab } from "@/components/swap/BrowseTab";
import { MineTab } from "@/components/swap/MineTab";
import { RequestsTab } from "@/components/swap/RequestsTab";
import { SignInGate } from "@/components/swap/SignInGate";

const TABS = ["browse", "rankings", "requests", "chats", "mine"] as const;
type Tab = (typeof TABS)[number];

function isTab(x: string | null): x is Tab {
  return !!x && (TABS as readonly string[]).includes(x);
}

export function HomeClient() {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const listingParam = searchParams.get("listing");

  const [tab, setTab] = useState<Tab>(isTab(urlTab) ? urlTab : "browse");

  useEffect(() => {
    const nextFromUrl: Tab = isTab(urlTab) ? urlTab : "browse";
    if (nextFromUrl !== tab) {
      setTab(nextFromUrl);
    }
  }, [urlTab, tab]);

  const setActiveTab = useCallback(
    (next: Tab, options?: { openListFormal?: boolean }) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "browse") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      if (next === "requests" && options?.openListFormal) {
        params.set("openList", "1");
        params.set("section", "listings");
      } else {
        params.delete("openList");
      }
      if (next !== "mine") {
        params.delete("edit");
      }
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  const content = useMemo(() => {
    // Landing only applies to "/" with no ?tab= and no ?listing= (email deep
    // links must still reach BrowseTab). Wait for auth to settle (status ===
    // "ready") before deciding — isAuthenticated is false while hydrating,
    // so deciding earlier would flash the marketing page at signed-in users
    // and fire its queries for them. Mirrors the idiom in RequireAuth /
    // Nav.tsx, which gate on `status` rather than `isAuthenticated` alone.
    if (tab === "browse" && !urlTab && !listingParam) {
      if (status !== "ready") return null;
      if (!isAuthenticated) return <LandingPage />;
    }
    if (tab === "browse") {
      return (
        <BrowseTab
          onNavigateToMine={() => setActiveTab("mine")}
          onNavigateToRequests={() =>
            setActiveTab("requests", { openListFormal: true })
          }
          onSignInRequired={() => router.push("/login?next=/")}
        />
      );
    }
    if (tab === "rankings") {
      return <RankingsTab />;
    }
    // Same hydration rule as the landing branch above: `isAuthenticated` is
    // false while auth resolves, so gating on it alone flashes the sign-in wall
    // at users who are already signed in.
    if (status !== "ready") return null;
    if (!isAuthenticated) {
      return <SignInGate />;
    }
    if (tab === "requests") {
      return <RequestsTab />;
    }
    if (tab === "chats") {
      return <MessagesTab />;
    }
    if (tab === "mine") {
      return <MineTab />;
    }
    return null;
  }, [tab, status, isAuthenticated, setActiveTab, router, urlTab, listingParam]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 px-4 py-8 sm:px-6">
      {content}
    </main>
  );
}
