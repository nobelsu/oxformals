"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { BrowseTab } from "@/components/swap/BrowseTab";
import { MineTab } from "@/components/swap/MineTab";
import { RequestsTab } from "@/components/swap/RequestsTab";
import { SignInGate } from "@/components/swap/SignInGate";

const TABS = ["browse", "requests", "mine"] as const;
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
    (next: Tab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "browse") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  const content = useMemo(() => {
    if (tab === "browse") {
      return (
        <BrowseTab
          onNavigateToMine={() => setActiveTab("mine")}
          onSignInRequired={() => router.push("/login?next=/")}
        />
      );
    }
    if (!isAuthenticated) {
      return <SignInGate />;
    }
    if (tab === "requests") {
      return <RequestsTab />;
    }
    if (tab === "mine") {
      return (
        <MineTab onNavigateToRequests={() => setActiveTab("requests")} />
      );
    }
    return null;
  }, [tab, isAuthenticated, setActiveTab, router]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8">{content}</main>
  );
}
