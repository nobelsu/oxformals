"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { JoinRequestFlow } from "@/components/swap/JoinRequestFlow";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import type { Listing } from "@/lib/data/types";

type Props = {
  listingId: string | null;
  open: boolean;
  onClose: () => void;
};

export function ListingBrowseDetailHost({ listingId, open, onClose }: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { getUser, getListing } = useData();
  const [joinTarget, setJoinTarget] = useState<Listing | null>(null);

  const listing = listingId ? (getListing(listingId) ?? null) : null;
  const isOwnListing = !!(user && listing && listing.ownerUserId === user.id);

  const memberUsers = useMemo(
    () =>
      listing
        ? listing.members
            .filter((mid) => mid !== listing.ownerUserId)
            .map(getUser)
            .filter((u): u is NonNullable<typeof u> => !!u)
        : [],
    [listing, getUser],
  );

  return (
    <>
      <ListingDetailModal
        open={open && !!listing}
        onClose={onClose}
        listing={listing}
        owner={listing ? (getUser(listing.ownerUserId) ?? null) : null}
        memberUsers={memberUsers}
        onRequest={
          listing && !isOwnListing
            ? () => {
                if (!isAuthenticated) {
                  router.push("/login?next=/");
                  return;
                }
                setJoinTarget(listing);
              }
            : undefined
        }
        disabled={!isAuthenticated}
        disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
      />

      <JoinRequestFlow target={joinTarget} onClose={() => setJoinTarget(null)} />
    </>
  );
}
