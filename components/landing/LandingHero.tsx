"use client";

import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListingRow } from "@/components/swap/ListingRow";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import { HeroShowcase, type HeroSlide } from "@/components/landing/HeroShowcase";
import { HeroFeedSlide } from "@/components/landing/HeroFeedSlide";
import { HeroReviewSlide } from "@/components/landing/HeroReviewSlide";

export function LandingHero({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.listings.listUpcomingPublic>;
}) {
  const docs = usePreloadedQuery(preloaded);

  const listings = docs?.map(mapListing) ?? [];
  const owners = new Map(
    (docs ?? []).map((doc) => [doc.ownerUserId as string, mapUser(doc.owner)]),
  );

  const loading = false;
  const isEmpty = !loading && listings.length === 0;

  const railSlide = loading ? (
    <div className="min-h-[16rem]" aria-hidden />
  ) : isEmpty ? (
    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
      <p className="text-base text-[var(--ink-muted)]">No open formals right now.</p>
      <Link
        href="/login"
        className="rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm font-semibold"
      >
        Sign in to list yours
      </Link>
    </div>
  ) : (
    <ul>
      {listings.map((listing) => {
        const owner = owners.get(listing.ownerUserId);
        if (!owner) return null;
        return (
          <li
            key={listing.id}
            className="border-t border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] first:border-t-0"
          >
            <ListingRow listing={listing} owner={owner} compact hideInterests />
          </li>
        );
      })}
    </ul>
  );

  const heroSlides: HeroSlide[] = [
    { id: "Open formals", label: "Open right now", content: railSlide },
    { id: "Your feed", label: "From people you follow", content: <HeroFeedSlide /> },
    { id: "Reviews", label: "Recent reviews", content: <HeroReviewSlide /> },
  ];

  return (
    <section className="grid min-h-[88svh] items-center gap-10 py-10 md:grid-cols-2 md:gap-14">
      <div className="flex flex-col items-start">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Find a seat at any{" "}
          <span className="whitespace-nowrap">Oxford formal.</span>
        </h1>
        <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Swap your place, take an empty seat, and eat somewhere you&rsquo;ve
          never been.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Sign in with Oxford email
          </Link>
          <Link
            href={BROWSE_ROUTE}
            className="inline-flex items-center justify-center rounded-full border-[2px] border-[var(--ink)] px-6 py-3 text-base font-semibold text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
          >
            Browse formals
          </Link>
        </div>

        <p className="mt-4 text-sm text-[var(--ink-soft)]">
          Oxford students only &middot; verified with your{" "}
          <code className="text-[0.85em]">@ox.ac.uk</code> email
        </p>
      </div>

      <HeroShowcase slides={heroSlides} />
    </section>
  );
}
