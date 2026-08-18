import type { Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingSocialTeaser } from "@/components/landing/LandingSocialTeaser";
import { SprayFinale } from "@/components/landing/SprayFinale";
import { LandingStats } from "@/components/landing/LandingStats";

export function LandingPage({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.listings.listUpcomingPublic>;
}) {
  return (
    <>
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 px-4 py-8 sm:px-6">
        <div className="relative z-10 flex flex-col">
          <LandingHero preloaded={preloaded} />
          <LandingHowItWorks />
          <LandingStats />
        </div>
      </main>
      <SprayFinale cover={<LandingSocialTeaser />} />
    </>
  );
}
