"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import { MY_FORMALS_SENTINEL } from "./CollegeFilter";
import { Hero } from "./Hero";
import { ListingDayList } from "./ListingDayList";
import { ListingDetailModal } from "./ListingDetailModal";
import { ListingRow } from "./ListingRow";
import { BlockingRequestModal } from "./BlockingRequestModal";
import { RequestPayModal } from "./RequestPayModal";
import { RequestSwapModal } from "./RequestSwapModal";
import { RequestTypeChooserModal } from "./RequestTypeChooserModal";
import { StatsStrip } from "./StatsStrip";
import { SwapConfirmedModal } from "./SwapConfirmedModal";
import { listingSupportsSwap } from "@/lib/data/listingType";
import type { RequestType } from "@/lib/data/types";
import {
  BrowseDateCalendar,
  BROWSE_DATE_CALENDAR_INSTRUCTIONS,
} from "./BrowseDateCalendar";
import { isoToLocalDateKey } from "@/lib/data/format";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import { ROLE_OPTIONS } from "@/lib/data/roles";
import type { Listing } from "@/lib/data/types";

type Props = {
  onNavigateToMine: () => void;
  onNavigateToRequests: () => void;
  onSignInRequired: () => void;
};

const BROWSE_TAB_FONT_CSS = `
.browse-tab-root > section:first-of-type h1 {
  font-size: clamp(3.375rem, 9vw, 5.625rem);
  line-height: 1;
}
.browse-tab-root > section:first-of-type > p {
  font-size: 1.03125rem;
  line-height: 1.45;
}
@media (min-width: 640px) {
  .browse-tab-root > section:first-of-type > p {
    font-size: 1.21875rem;
  }
}
.browse-tab-root > section:first-of-type button,
.browse-tab-root > section:first-of-type .browse-college-more {
  font-size: 0.84375rem;
}
.browse-tab-root > section:nth-of-type(2) .text-4xl {
  font-size: 2.4375rem;
}
.browse-tab-root > section:nth-of-type(2) .text-sm {
  font-size: 0.796875rem;
}
.browse-tab-root > div.flex-col .flex-wrap button {
  font-size: 0.796875rem;
}
`;

const FILTER_FIELD_CLS =
  "min-w-0 origin-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base shadow-[0_0_0_0_transparent] transition-[border-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform focus:outline-none focus:border-[var(--accent-hover)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_52%,transparent),0_12px_32px_-14px_color-mix(in_srgb,var(--accent-hover)_68%,transparent)] focus:scale-[1.012] motion-reduce:transition-none motion-reduce:focus:scale-100 motion-reduce:focus:shadow-[0_0_0_0_transparent]";

const BROWSE_COLLEGE_CHIP_LIMIT = 3;

const CHIP_BASE =
  "cursor-pointer rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30";
const CHIP_IDLE = `${CHIP_BASE} border-[var(--ink)]/30 bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--ink)]/50`;
const CHIP_ON = `${CHIP_BASE} border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]`;
/** Same look as idle chips; span only (no hover / focus ring). */
const CHIP_MORE_META =
  "inline-flex select-none items-center rounded-full border-2 border-[var(--ink)]/30 bg-[var(--bg)] px-3 py-1.5 text-xs font-medium tabular-nums text-[var(--ink)]";

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function ClearInputIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function BrowseTab({
  onNavigateToRequests,
  onSignInRequired,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingParam = searchParams.get("listing");
  const clearedListingParamRef = useRef<string | null>(null);

  const { user, isAuthenticated } = useAuth();
  const {
    listings,
    requests,
    wishlist,
    sendRequest,
    getUser,
    getListing,
  } = useData();

  const [collegeFilter, setCollegeFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [pickedCalendarDates, setPickedCalendarDates] = useState<string[]>(
    [],
  );
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [pendingRequestType, setPendingRequestType] = useState<RequestType | null>(
    null,
  );
  const [typeChooserTarget, setTypeChooserTarget] = useState<Listing | null>(null);
  const [showNoListingPrompt, setShowNoListingPrompt] = useState(false);
  const [blockingRequestOpen, setBlockingRequestOpen] = useState(false);
  const [blockingHasAccepted, setBlockingHasAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    requestType: RequestType;
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  const { topBrowseColleges, moreBrowseCollegesCount } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      if (l.status !== "active") continue;
      counts.set(l.college, (counts.get(l.college) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    const topBrowseColleges = sorted
      .slice(0, BROWSE_COLLEGE_CHIP_LIMIT)
      .map(([name]) => name);
    const moreBrowseCollegesCount = Math.max(
      0,
      sorted.length - BROWSE_COLLEGE_CHIP_LIMIT,
    );
    return { topBrowseColleges, moreBrowseCollegesCount };
  }, [listings]);

  useEffect(() => {
    const styleId = "browse-tab-type-scale";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = BROWSE_TAB_FONT_CSS;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!listingParam || clearedListingParamRef.current === listingParam) {
      return;
    }
    const listing = getListing(listingParam);
    if (!listing) return;

    setDetailListing(listing);
    clearedListingParamRef.current = listingParam;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("listing");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }, [listingParam, getListing, listings, router, searchParams]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const topBrowseCollegesSet = useMemo(
    () => new Set(topBrowseColleges),
    [topBrowseColleges],
  );

  const effectiveCollegeFilter = useMemo(() => {
    if (
      collegeFilter === MY_FORMALS_SENTINEL &&
      (!isAuthenticated || wishlist.length === 0)
    ) {
      return null;
    }
    if (
      collegeFilter !== null &&
      collegeFilter !== MY_FORMALS_SENTINEL
    ) {
      return topBrowseCollegesSet.has(collegeFilter) ? collegeFilter : null;
    }
    if (collegeFilter === MY_FORMALS_SENTINEL) {
      return MY_FORMALS_SENTINEL;
    }
    return null;
  }, [
    collegeFilter,
    isAuthenticated,
    wishlist.length,
    topBrowseCollegesSet,
  ]);

  const collegeFilteredListings = useMemo(
    () =>
      listings
        .filter((l) => l.status === "active")
        .filter((l) => Date.parse(l.dateTime) > Date.now())
        .filter((l) => !user || l.ownerUserId !== user.id)
        .filter((l) => {
          if (!effectiveCollegeFilter) return true;
          if (effectiveCollegeFilter === MY_FORMALS_SENTINEL)
            return wishlistSet.has(l.college);
          return l.college === effectiveCollegeFilter;
        })
        .filter((l) => !roleFilter || l.role === roleFilter),
    [listings, user, effectiveCollegeFilter, wishlistSet, roleFilter],
  );

  const browseListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const dateSet =
      pickedCalendarDates.length > 0
        ? new Set(pickedCalendarDates)
        : null;
    return collegeFilteredListings
      .filter((l) => {
        if (!dateSet) return true;
        const key = isoToLocalDateKey(l.dateTime);
        return dateSet.has(key);
      })
      .filter((l) => {
        if (!q) return true;
        const owner = getUser(l.ownerUserId);
        const parts = [
          l.college,
          l.menu,
          l.message,
          l.year,
          l.role,
          owner?.name ?? "",
        ];
        return parts.some((p) => (p ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime));
  }, [collegeFilteredListings, pickedCalendarDates, searchQuery, getUser]);

  const hasActiveFilters =
    pickedCalendarDates.length > 0 || roleFilter !== null;

  function clearAllFilters() {
    setPickedCalendarDates([]);
    setRoleFilter(null);
  }

  const hasCollegeMatches = collegeFilteredListings.length > 0;

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (l) =>
              l.ownerUserId === user.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType),
          )
        : [],
    [listings, user],
  );

  const openSwaps = collegeFilteredListings.length;

  function openRequestFlow(listing: Listing, requestType: RequestType) {
    if (user) {
      const blocking = findBlockingOutgoingRequestForTarget(
        requests,
        user.id,
        listing.id,
      );
      if (blocking) {
        setBlockingHasAccepted(blocking.status === "accepted");
        setBlockingRequestOpen(true);
        return;
      }
    }
    if (requestType === "swap" && myActiveListings.length === 0) {
      setShowNoListingPrompt(true);
      return;
    }
    setPendingRequestType(requestType);
    setRequestTarget(listing);
  }

  function handleRequestClick(listing: Listing) {
    if (!isAuthenticated) {
      onSignInRequired();
      return;
    }
    if (listing.listingType === "both") {
      setTypeChooserTarget(listing);
      return;
    }
    if (listing.listingType === "pay") {
      openRequestFlow(listing, "pay");
      return;
    }
    openRequestFlow(listing, "swap");
  }

  function handleRequestTypeChosen(requestType: RequestType) {
    if (!typeChooserTarget) return;
    const target = typeChooserTarget;
    setTypeChooserTarget(null);
    openRequestFlow(target, requestType);
  }

  function scrollToBrowseListings() {
    document
      .querySelector("[data-browse-listings]")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleBrowseSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    scrollToBrowseListings();
  }

  return (
    <>
      <div className="browse-tab-root flex flex-col gap-10">
        <Hero
          footer={
            <div className="mx-auto w-full max-w-xl px-4 pb-1">
              <div className="flex w-full min-w-0 flex-col gap-5 text-left">
                <form
                  className="flex min-w-0 items-center gap-2"
                  onSubmit={handleBrowseSearchSubmit}
                >
                  <div className="relative min-w-0 flex-1">
                    <input
                      id="browse-hero-search"
                      type="text"
                      inputMode="search"
                      enterKeyHint="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for college, menu, role, host..."
                      aria-label="Search for college, menu, role, host"
                      autoComplete="off"
                      className={`w-full min-w-0 ${FILTER_FIELD_CLS} ${
                        searchQuery !== "" ? "pr-11" : ""
                      }`}
                    />
                    {searchQuery !== "" ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30"
                        aria-label="Clear search"
                      >
                        <ClearInputIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiltersModalOpen(true)}
                    className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30"
                    aria-label="Open filters"
                    aria-expanded={filtersModalOpen}
                  >
                    <FilterIcon className="h-5 w-5" />
                    {hasActiveFilters ? (
                      <span
                        className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg)]"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </form>
                <div
                  className="flex flex-wrap items-center justify-center gap-2"
                  role="group"
                  aria-label="College"
                >
                  <button
                    type="button"
                    aria-pressed={effectiveCollegeFilter === null}
                    onClick={() => setCollegeFilter(null)}
                    className={
                      effectiveCollegeFilter === null ? CHIP_ON : CHIP_IDLE
                    }
                  >
                    All colleges
                  </button>
                  {isAuthenticated && wishlist.length > 0 ? (
                    <button
                      type="button"
                      aria-pressed={
                        effectiveCollegeFilter === MY_FORMALS_SENTINEL
                      }
                      onClick={() => setCollegeFilter(MY_FORMALS_SENTINEL)}
                      className={
                        effectiveCollegeFilter === MY_FORMALS_SENTINEL
                          ? CHIP_ON
                          : CHIP_IDLE
                      }
                    >
                      My favourites
                    </button>
                  ) : null}
                  {topBrowseColleges.map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={effectiveCollegeFilter === name}
                      onClick={() => setCollegeFilter(name)}
                      className={
                        effectiveCollegeFilter === name ? CHIP_ON : CHIP_IDLE
                      }
                    >
                      {name}
                    </button>
                  ))}
                  {moreBrowseCollegesCount > 0 ? (
                    <span
                      className={`browse-college-more ${CHIP_MORE_META}`}
                      title={`${moreBrowseCollegesCount} more colleges with open swaps — use search or All colleges`}
                    >
                      + {moreBrowseCollegesCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          }
        />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4">
          <StatsStrip openSwaps={openSwaps} />
        </div>

        {browseListings.length === 0 ? (
          <SketchCard className="p-10 text-center text-[var(--ink-muted)] text-[0.9375rem] sm:text-[1.125rem] leading-snug">
            {hasCollegeMatches ? (
              <>
                Nothing matches your filters. Try another college above, open
                filters to choose dates or role, or clear your search.
              </>
            ) : (
              <>
                No open swaps here yet. Try another college or list your own
                formal.
              </>
            )}
          </SketchCard>
        ) : (
          <div
            data-browse-listings
            className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:px-6"
          >
            <ListingDayList
              listings={browseListings}
              className="mx-auto w-full max-w-6xl"
              renderRow={(l) => {
                const owner = getUser(l.ownerUserId);
                if (!owner) return null;
                const members = (l.members ?? [])
                  .filter((mid) => mid !== l.ownerUserId)
                  .map(getUser)
                  .filter((u): u is NonNullable<typeof u> => !!u);
                return (
                  <ListingRow
                    listing={l}
                    owner={owner}
                    memberUsers={members}
                    onPress={() => setDetailListing(l)}
                    onRequest={() => handleRequestClick(l)}
                    disabled={!isAuthenticated}
                    disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
                  />
                );
              }}
            />
          </div>
        )}
      </div>

      <Modal
        open={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        title="Filters"
        compact
        panelClassName="max-w-lg"
        bodyScrollable={false}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-sm uppercase tracking-wide text-[var(--ink)]">
              Dates
            </h3>
            <p className="text-left text-[0.7rem] leading-snug text-[var(--ink-muted)] sm:text-xs">
              {BROWSE_DATE_CALENDAR_INSTRUCTIONS}
            </p>
            <BrowseDateCalendar
              embedded
              value={pickedCalendarDates}
              onChange={setPickedCalendarDates}
            />
          </div>
          <div
            className="flex flex-col gap-2 border-t border-[var(--ink)]/15 pt-4"
            role="group"
            aria-label="Role"
          >
            <h3 className="font-display text-sm uppercase tracking-wide text-[var(--ink)]">
              Role
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                aria-pressed={roleFilter === null}
                onClick={() => setRoleFilter(null)}
                className={roleFilter === null ? CHIP_ON : CHIP_IDLE}
              >
                All roles
              </button>
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={roleFilter === role}
                  onClick={() => setRoleFilter(role)}
                  className={roleFilter === role ? CHIP_ON : CHIP_IDLE}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] px-6 py-2.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
              >
                Clear filters
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setFiltersModalOpen(false)}
              className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      <ListingDetailModal
        open={!!detailListing}
        onClose={() => setDetailListing(null)}
        listing={detailListing}
        owner={detailListing ? getUser(detailListing.ownerUserId) ?? null : null}
        memberUsers={
          detailListing
            ? (detailListing.members ?? [])
                .filter((mid) => mid !== detailListing.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u)
            : []
        }
        onRequest={() => {
          if (detailListing) handleRequestClick(detailListing);
        }}
        disabled={!isAuthenticated}
        disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
        hideInterests
      />

      <RequestTypeChooserModal
        open={!!typeChooserTarget}
        onClose={() => setTypeChooserTarget(null)}
        college={typeChooserTarget?.college ?? ""}
        onChoose={handleRequestTypeChosen}
      />

      <RequestSwapModal
        open={!!requestTarget && pendingRequestType === "swap"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        myListings={myActiveListings}
        onSubmit={async ({ offeringListingId, message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "swap",
            targetListingId: requestTarget.id,
            offeringListingId,
            message,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "swap",
              mine: getListing(offeringListingId) ?? null,
              theirs: getListing(requestTarget.id) ?? null,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <RequestPayModal
        open={!!requestTarget && pendingRequestType === "pay"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        onSubmit={async ({ message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "pay",
            targetListingId: requestTarget.id,
            message,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "pay",
              mine: null,
              theirs: getListing(requestTarget.id) ?? null,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        requestType={confirmed?.requestType ?? "swap"}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
        otherUserId={confirmed?.otherUserId ?? null}
      />

      <BlockingRequestModal
        open={blockingRequestOpen}
        onClose={() => setBlockingRequestOpen(false)}
        hasAccepted={blockingHasAccepted}
        onViewRequests={onNavigateToRequests}
      />

      <Modal
        open={showNoListingPrompt}
        onClose={() => setShowNoListingPrompt(false)}
        title="List your formal first"
        panelClassName="max-w-sm"
      >
        <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
          You need an active swap listing before you can request a swap.
          Pay-only listings cannot be used in swaps.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowNoListingPrompt(false);
            onNavigateToRequests();
          }}
          className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          + List my formal
        </button>
      </Modal>
    </>
  );
}
