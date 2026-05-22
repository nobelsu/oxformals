"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MyListingCard } from "@/components/swap/MyListingCard";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";

type Props = {
  user: User;
  myActiveListings: Listing[];
  myBookedListings: Listing[];
  pendingCountByListing: Map<string, number>;
  pendingReviewSet: Set<string>;
  getUser: (id: string) => User | undefined;
  onListFormal: () => void;
};

export function MyListingsSection({
  user,
  myActiveListings,
  myBookedListings,
  pendingCountByListing,
  pendingReviewSet,
  getUser,
  onListFormal,
}: Props) {
  const router = useRouter();
  const [listingsTab, setListingsTab] = useState<"active" | "past">("active");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl uppercase tracking-wide">
          My listings
        </h2>
        <button
          type="button"
          onClick={onListFormal}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-2xl leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          aria-label="List a formal"
        >
          +
        </button>
      </div>

      <section>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-full border-[2px] border-[var(--ink)] p-0.5"
            role="tablist"
            aria-label="My listings"
          >
            <button
              type="button"
              role="tab"
              aria-selected={listingsTab === "active"}
              onClick={() => setListingsTab("active")}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition-all duration-200 ease-out motion-reduce:transition-none ${
                listingsTab === "active"
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : "text-[var(--ink)] hover:bg-[var(--paper)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 active:scale-[0.98]"
              }`}
            >
              Active
              {myActiveListings.length > 0 ? (
                <span className="ml-1.5 opacity-80">
                  ({myActiveListings.length})
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={listingsTab === "past"}
              onClick={() => setListingsTab("past")}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition-all duration-200 ease-out motion-reduce:transition-none ${
                listingsTab === "past"
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : "text-[var(--ink)] hover:bg-[var(--paper)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 active:scale-[0.98]"
              }`}
            >
              Past
              {myBookedListings.length > 0 ? (
                <span className="ml-1.5 opacity-80">
                  ({myBookedListings.length})
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {listingsTab === "active" ? (
          myActiveListings.length === 0 ? (
            <p className="mt-4 text-[var(--ink-muted)]">
              You don&apos;t have any active listings yet. Tap + to list a
              formal.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
              {myActiveListings.map((listing) => {
                const members = listing.members
                  .map(getUser)
                  .filter((u): u is User => !!u);
                return (
                  <MyListingCard
                    key={listing.id}
                    listing={listing}
                    pendingRequestCount={
                      pendingCountByListing.get(listing.id) ?? 0
                    }
                    profile={{ year: user.year, role: user.role }}
                    memberUsers={members}
                    canRate={pendingReviewSet.has(listing.id)}
                    onViewRequests={() =>
                      router.push(`/requests/${listing.id}`)
                    }
                  />
                );
              })}
            </div>
          )
        ) : myBookedListings.length === 0 ? (
          <p className="mt-4 text-[var(--ink-muted)]">
            You don&apos;t have any past listings yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myBookedListings.map((listing) => {
              const members = listing.members
                .map(getUser)
                .filter((u): u is User => !!u);
              return (
                <MyListingCard
                  key={listing.id}
                  listing={listing}
                  pendingRequestCount={0}
                  profile={{ year: user.year, role: user.role }}
                  memberUsers={members}
                  canRate={pendingReviewSet.has(listing.id)}
                  onViewRequests={() => router.push(`/requests/${listing.id}`)}
                  compact
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
