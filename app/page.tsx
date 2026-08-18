import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { HomeClient } from "./HomeClient";
import { LandingPage } from "@/components/landing/LandingPage";

const RAIL_LIMIT = 5;

/**
 * `/` is per-user, so this renders on the server per request. A logged-out
 * visitor on a bare `/` (no `?tab=`, no `?listing=` deep link) gets the marketing
 * landing page with its formals rail server-rendered — `preloadQuery` runs the
 * public query on the server so the data ships in the HTML instead of arriving
 * over a client waterfall. Everyone else falls through to the client home, which
 * still owns the tabbed app and the signed-in surfaces.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const hasTab = typeof sp.tab === "string" && sp.tab.length > 0;
  const hasListing = typeof sp.listing === "string" && sp.listing.length > 0;

  if (!hasTab && !hasListing && !(await isAuthenticatedNextjs())) {
    const preloaded = await preloadQuery(api.listings.listUpcomingPublic, {
      limit: RAIL_LIMIT,
    });
    return <LandingPage preloaded={preloaded} />;
  }

  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
