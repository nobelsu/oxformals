import type { Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingSocialTeaser } from "@/components/landing/LandingSocialTeaser";
import { SprayFinale } from "@/components/landing/SprayFinale";
import { SprayFinaleCover } from "@/components/landing/SprayFinaleCover";
import { LandingStats, type SiteStats } from "@/components/landing/LandingStats";

export function LandingPage({
  preloaded,
  stats,
}: {
  preloaded: Preloaded<typeof api.listings.listUpcomingPublic>;
  stats: SiteStats;
}) {
  return (
    <div data-landing-theme="navy" className="flex min-h-0 flex-1 flex-col">
      <main className="flex w-full flex-1 flex-col min-h-0">
        <div className="mx-auto flex w-full max-w-5xl min-h-[calc(100svh-var(--app-nav-height))] flex-col justify-center px-4 sm:px-6">
          <LandingHero preloaded={preloaded} />
        </div>
        <LandingHowItWorks />
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <LandingStats stats={stats} />
        </div>
        <LandingSocialTeaser />
      </main>
      <SprayFinale cover={<SprayFinaleCover />} />
    </div>
  );
}
