"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { MyListingCard } from "./MyListingCard";
import { ProfileEditor } from "./ProfileEditor";
import { WishlistChips } from "./WishlistChips";

type Props = {
  onNavigateToRequests: () => void;
};

export function MineTab({ onNavigateToRequests }: Props) {
  const { user } = useAuth();
  const { listings, requests, wishlist, toggleWishlist } = useData();

  const myListings = useMemo(
    () => (user ? listings.filter((l) => l.ownerUserId === user.id) : []),
    [listings, user],
  );

  const pendingCountByListing = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "pending") continue;
      map.set(r.targetListingId, (map.get(r.targetListingId) ?? 0) + 1);
    }
    return map;
  }, [requests]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-10">
      <ProfileEditor />

      <section>
        <h2 className="font-display text-3xl uppercase tracking-wide">My listings</h2>
        {myListings.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">
            Nothing listed yet. Open the Requests tab and tap + next to
            &quot;Requests I&apos;ve sent&quot; to list a formal.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
            {myListings.map((l) => (
              <MyListingCard
                key={l.id}
                listing={l}
                pendingRequestCount={pendingCountByListing.get(l.id) ?? 0}
                onViewRequests={onNavigateToRequests}
              />
            ))}
          </div>
        )}
      </section>

      <WishlistChips selected={wishlist} onToggle={toggleWishlist} />
    </div>
  );
}
