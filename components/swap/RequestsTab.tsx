"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { ListFormalForm } from "./ListFormalForm";
import { MyListingCard } from "./MyListingCard";

export function RequestsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { requests, listings, createListing, getUser } = useData();

  const myListings = useMemo(
    () => (user ? listings.filter((l) => l.ownerUserId === user.id) : []),
    [listings, user],
  );

  const myActiveListings = useMemo(
    () => myListings.filter((l) => l.status === "active"),
    [myListings],
  );

  const [listFormalOpen, setListFormalOpen] = useState(false);
  const shouldOpenListModal = searchParams.get("openList") === "1";

  useEffect(() => {
    if (!shouldOpenListModal) return;
    setListFormalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openList");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }, [shouldOpenListModal, router, searchParams]);

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
    <>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            My active listings
          </h2>
          <button
            type="button"
            onClick={() => setListFormalOpen(true)}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-2xl leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            aria-label="List a formal"
          >
            +
          </button>
        </div>
        {myActiveListings.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">
            You don&apos;t have any active listings yet. Tap + to list a formal.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
            {myActiveListings.map((listing) => {
              const members = listing.members
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u);
              return (
                <MyListingCard
                  key={listing.id}
                  listing={listing}
                  pendingRequestCount={pendingCountByListing.get(listing.id) ?? 0}
                  profile={{ year: user.year, role: user.role }}
                  memberUsers={members}
                  onViewRequests={() => router.push(`/requests/${listing.id}`)}
                />
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={listFormalOpen}
        onClose={() => setListFormalOpen(false)}
        panelClassName="!max-w-3xl"
      >
        <ListFormalForm
          embedded
          profile={{
            college: user.college,
            year: user.year,
            role: user.role,
          }}
          onSubmit={(input) => {
            const created = createListing(input);
            if (created) setListFormalOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
