"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { MessagesTab } from "@/components/chat/MessagesTab";
import { RankingsTab } from "@/components/colleges/RankingsTab";
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
    // The logged-out marketing landing is server-rendered in app/page.tsx; by
    // the time HomeClient mounts we are either signed in or on a tab/deep-link.
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
  }, [tab, status, isAuthenticated, setActiveTab, router]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 px-4 py-8 sm:px-6">
      {content}
    </main>
  );
}
