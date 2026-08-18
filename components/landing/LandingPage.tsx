import type { Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingSocialTeaser } from "@/components/landing/LandingSocialTeaser";

export function LandingPage({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.listings.listUpcomingPublic>;
}) {
  return (
    <div className="flex flex-col">
      <LandingHero preloaded={preloaded} />
      <LandingHowItWorks />
      <LandingSocialTeaser />
    </div>
  );
}
