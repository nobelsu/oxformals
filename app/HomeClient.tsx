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
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

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
    if (!isAuthenticated && tab === "browse" && !urlTab) {
      return <LandingPage />;
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
  }, [tab, isAuthenticated, setActiveTab, router, urlTab]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 px-4 py-8 sm:px-6">
      {content}
    </main>
  );
}
