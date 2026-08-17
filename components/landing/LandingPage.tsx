import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingSocialTeaser } from "@/components/landing/LandingSocialTeaser";

export function LandingPage() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <LandingHowItWorks />
      <LandingSocialTeaser />
    </div>
  );
}
