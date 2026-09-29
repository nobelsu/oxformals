"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { collegeColours } from "@/components/colleges/CollegeCrest";
import { formalTypeInfo } from "@/components/swap/FormalTypeTag";
import { Avatar } from "@/components/ui/Avatar";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { JoinRequestFlow } from "@/components/swap/JoinRequestFlow";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import {
  clampSeatsAvailable,
  formatListingSeatsSuffix,
  formatListingTime,
  formatPrice,
  formatWeekdayDate,
  formatYearLabel,
} from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Loading";
import { useNowMs } from "@/lib/hooks/useNowMs";

const LINE = "border-[color-mix(in_srgb,var(--ink)_14%,transparent)]";

/** `Swap`, `Pay £18`, `Swap or pay` — the hero's payment pill. */
function paymentLabel(l: Listing): string {
  if (l.listingType === "swap") return "Swap";
  if (l.listingType === "both") return "Swap or pay";
  return l.price !== undefined ? `Pay ${formatPrice(l.price)}` : "Pay";
}

/** `£18`, `Swap`, `Swap or pay` — the compact rows' tail. */
function paymentShort(l: Listing): string {
  if (l.listingType === "pay" && l.price !== undefined) return formatPrice(l.price);
  return paymentLabel(l);
}

function seatsLeft(l: Listing): number {
  return clampSeatsAvailable(l.seatsAvailable, l.groupSize);
}

function stripe(college: string): string {
  const [c1, c2] = collegeColours(college);
  return `repeating-linear-gradient(90deg, ${c1} 0 30px, ${c2} 30px 40px)`;
}

function UpcomingSkeleton({ college }: { college: string }) {
  return (
    <div role="status" aria-label="Loading">
      <div className="overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-[var(--paper)]">
        <div
          className="h-[46px] border-b-2 border-[var(--ink)] opacity-40"
          style={{ background: stripe(college) }}
        />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={`flex justify-between border-t-[1.5px] ${LINE} px-0.5 py-3 first:mt-2`}>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function NextUpCard({
  listing,
  college,
  host,
  onOpen,
  cta,
}: {
  listing: Listing;
  college: string;
  host: User | undefined;
  onOpen: () => void;
  cta: { label: string; onClick: () => void } | null;
}) {
  const hostLine = host
    ? [host.name.split(" ")[0], formatYearLabel(host.year) || formatYearLabel(listing.year)]
        .filter(Boolean)
        .join(" · ")
    : null;
  const meta = [
    formatListingTime(listing.dateTime),
    formalTypeInfo(listing.formalType).label,
    formatListingSeatsSuffix(seatsLeft(listing), false),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Next up, ${formatWeekdayDate(listing.dateTime)} ${formatListingTime(listing.dateTime)}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,var(--paper))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30"
    >
      <div
        aria-hidden
        className="h-[46px] border-b-2 border-[var(--ink)]"
        style={{ background: stripe(college) }}
      />
      <div className="p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Next up
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[1.9rem] leading-none">
            {formatWeekdayDate(listing.dateTime)}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--tag)] px-2.5 py-0.5 text-xs font-bold text-[var(--tag-ink)]">
            {paymentLabel(listing)}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{meta}</p>
        {host ? (
          <Link
            href={`/profile/${host.id}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="mt-3 inline-flex max-w-full items-center gap-2 text-sm hover:underline"
          >
            <Avatar name={host.name} size="sm" source={host.avatar} />
            <span className="truncate">{hostLine}</span>
          </Link>
        ) : null}
        {cta ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cta.onClick();
            }}
            onKeyDown={(e) => e.stopPropagation()}
            data-onboarding="request"
            className="mt-3 block w-full cursor-pointer rounded-full bg-[var(--accent)] py-2.5 text-center text-sm font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            {cta.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  college: string;
};

export function CollegeListingsSection({ college }: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { getUser: getKnownUser } = useData();
  const nowMs = useNowMs();

  const rawListings = useQuery(api.listings.listActiveListingsForCollege, {
    college,
  });
  // Signed out, the app knows nobody: fetch just this page's hosts.
  const signedOutHosts = useQuery(
    api.listings.listActiveHostsForCollege,
    isAuthenticated ? "skip" : { college },
  );
  const getUser = useCallback(
    (userId: string) => {
      const known = getKnownUser(userId);
      if (known) return known;
      const host = signedOutHosts?.find((h) => h._id === userId);
      return host ? mapUser(host) : undefined;
    },
    [getKnownUser, signedOutHosts],
  );

  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [joinTarget, setJoinTarget] = useState<Listing | null>(null);

  const collegeSlug = collegeToSlug(college);
  const loginNext = `/college/${collegeSlug}?section=listings`;

  const openListings = useMemo(() => {
    if (rawListings === undefined) return undefined;
    return rawListings
      .map(mapListing)
      .filter((l) => Date.parse(l.dateTime) > nowMs)
      .filter((l) => !user || l.ownerUserId !== user.id)
      .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
  }, [rawListings, user, nowMs]);

  const handleRequestClick = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }
      setJoinTarget(listing);
    },
    [isAuthenticated, router, loginNext],
  );

  const listingDisabled = !isAuthenticated;

  if (openListings === undefined) {
    return <UpcomingSkeleton college={college} />;
  }

  if (openListings.length === 0) {
    return (
      <EmptyState icon="ticket" title="No open formals" />
    );
  }

  const [next, ...rest] = openListings;

  return (
    <>
      <NextUpCard
        listing={next}
        college={college}
        host={getUser(next.ownerUserId)}
        onOpen={() => setDetailListing(next)}
        cta={
          !isAuthenticated
            ? { label: "Sign in to request", onClick: () => handleRequestClick(next) }
            : user && next.members.includes(user.id)
              ? null
              : { label: "Request a seat", onClick: () => handleRequestClick(next) }
        }
      />

      {rest.length > 0 ? (
        <ul className="mt-2">
          {rest.map((l) => {
            const left = seatsLeft(l);
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setDetailListing(l)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 border-t-[1.5px] ${LINE} px-0.5 py-2.5 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]`}
                >
                  <span className="min-w-0 truncate">
                    <b>{formatWeekdayDate(l.dateTime)}</b> · {formatListingTime(l.dateTime)}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[var(--ink-muted)]">
                    {left === 0 ? "Full" : `${left} left`} · {paymentShort(l)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ListingDetailModal
        open={!!detailListing}
        onClose={() => setDetailListing(null)}
        listing={detailListing}
        owner={detailListing ? getUser(detailListing.ownerUserId) ?? null : null}
        memberUsers={
          detailListing
            ? detailListing.members
                .filter((mid) => mid !== detailListing.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u)
            : []
        }
        onRequest={() => {
          if (detailListing) handleRequestClick(detailListing);
        }}
        disabled={listingDisabled}
        disabledLabel={!isAuthenticated ? "Sign in to request" : undefined}
      />

      <JoinRequestFlow target={joinTarget} onClose={() => setJoinTarget(null)} />
    </>
  );
}
