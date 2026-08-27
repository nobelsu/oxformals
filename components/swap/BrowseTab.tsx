"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import { MY_FORMALS_SENTINEL } from "./CollegeFilter";
import { ListingDayList } from "./ListingDayList";
import { ListingDetailModal } from "./ListingDetailModal";
import { ListingRow } from "./ListingRow";
import { BlockingRequestModal } from "./BlockingRequestModal";
import { RequestPayModal } from "./RequestPayModal";
import { RequestSwapModal } from "./RequestSwapModal";
import { RequestTypeChooserModal } from "./RequestTypeChooserModal";
import { SwapConfirmedModal } from "./SwapConfirmedModal";
import { listingSupportsSwap } from "@/lib/data/listingType";
import type { RequestType } from "@/lib/data/types";
import { isoToLocalDateKey } from "@/lib/data/format";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import { BrowseFiltersModal } from "./BrowseFiltersModal";
import type { Listing } from "@/lib/data/types";

type Props = {
  onNavigateToMine: () => void;
  onNavigateToRequests: () => void;
  onSignInRequired: () => void;
};

const FILTER_FIELD_CLS =
  "min-w-0 origin-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base shadow-[0_0_0_0_transparent] transition-[border-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform focus:outline-none focus:border-[var(--accent-hover)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_52%,transparent),0_12px_32px_-14px_color-mix(in_srgb,var(--accent-hover)_68%,transparent)] focus:scale-[1.012] motion-reduce:transition-none motion-reduce:focus:scale-100 motion-reduce:focus:shadow-[0_0_0_0_transparent]";

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

function SearchIcon({ className }: { className?: string }) {
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
      {/* Glyph bounding box centered on the viewBox so it sits dead-centre. */}
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

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
  // Search is a global control living in the nav; the query travels through the
  // `?q=` URL param so the nav field and the mobile in-page field stay in sync.
  const searchQuery = searchParams.get("q") ?? "";
  const setSearchQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Store the raw value (spaces intact) so multi-word typing works; the
      // filter trims when matching. Blank/whitespace-only clears the param.
      if (value.trim()) params.set("q", value);
      else params.delete("q");
      // Keep results visible: a query only makes sense on the browse tab.
      params.set("tab", "browse");
      params.delete("listing");
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );
  const [filterOpen, setFilterOpen] = useState(false);
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

  // Every college with an open listing, most-listed first — feeds the College
  // dropdown in the filter bar.
  const browseColleges = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      if (l.status !== "active") continue;
      counts.set(l.college, (counts.get(l.college) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([name]) => name);
  }, [listings]);

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
    // Keep an explicit tab once the id is consumed. Bare "/" is the logged-out
    // landing page, so dropping the param without it would yank a deep-linked
    // visitor off the listing they just opened and onto the marketing page.
    if (!params.has("tab")) params.set("tab", "browse");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [listingParam, getListing, listings, router, searchParams]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const effectiveCollegeFilter = useMemo(() => {
    // "My favourites" only applies when the user is signed in with a wishlist;
    // otherwise any college name (or null) passes straight through.
    if (
      collegeFilter === MY_FORMALS_SENTINEL &&
      (!isAuthenticated || wishlist.length === 0)
    ) {
      return null;
    }
    return collegeFilter;
  }, [collegeFilter, isAuthenticated, wishlist.length]);

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
    collegeFilter !== null ||
    pickedCalendarDates.length > 0 ||
    roleFilter !== null;

  function clearAllFilters() {
    setCollegeFilter(null);
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
      <div className="browse-tab-root flex flex-col gap-6">
        {/* Search + filters bar — sticky below nav on sm+ (scrolls away on
            mobile so the day-rail's sticky day headers never collide with it) */}
        <div className="bg-[var(--bg)] pb-3 pt-3 sm:sticky sm:top-[var(--app-nav-height)] sm:z-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pb-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
              Upcoming formals
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              {/* Desktop search — expands on focus. Mobile uses the full-width
                  field below. */}
              <label
                className={`group hidden h-10 items-center overflow-hidden rounded-full border-2 bg-[var(--paper)] transition-[width,border-color] duration-300 ease-out sm:flex ${
                  searchQuery
                    ? "w-60 border-[var(--accent)]"
                    : "w-10 border-[var(--ink)]/25 focus-within:w-60 focus-within:border-[var(--accent)]"
                }`}
              >
                <span className="grid h-full w-9 shrink-0 place-items-center text-[var(--ink-muted)]">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search college, host..."
                  aria-label="Search for college, menu, role, host"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent pr-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                  >
                    <ClearInputIcon className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
              {/* Filters — everything (college, dates, role) lives in here. */}
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                aria-label="Filters"
                aria-expanded={filterOpen}
                className="relative hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)]/25 bg-[var(--paper)] text-[var(--ink)] transition-colors hover:border-[var(--ink)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30 sm:flex"
              >
                <FilterIcon className="h-5 w-5" />
                {hasActiveFilters ? (
                  <span
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--paper)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            </div>
          </div>
          {/* Mobile: full-width search + filter button (desktop has both above). */}
          <div className="flex items-center gap-2 sm:hidden">
            <form
              className="flex min-w-0 flex-1 items-center"
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
                  placeholder="Search college, menu, host..."
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
            </form>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filters"
              aria-expanded={filterOpen}
              className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30"
            >
              <FilterIcon className="h-5 w-5" />
              {hasActiveFilters ? (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg)]"
                  aria-hidden
                />
              ) : null}
            </button>
          </div>
        </div>
        </div>

        {browseListings.length === 0 ? (
          <div className="mx-auto w-full max-w-3xl">
            <SketchCard className="p-8 text-center text-[var(--ink-muted)] text-[0.875rem] sm:text-[1rem] leading-snug">
              {hasCollegeMatches ? (
                <>
                  Nothing matches your filters. Try another college, adjust the
                  date or role, or clear your search.
                </>
              ) : (
                <>
                  No open swaps here yet. Try another college or list your own
                  formal.
                </>
              )}
            </SketchCard>
          </div>
        ) : (
          <div data-browse-listings>
            <ListingDayList
              listings={browseListings}
              variant="card"
              className="mx-auto w-full max-w-3xl"
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
                    card
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

      <BrowseFiltersModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        colleges={browseColleges}
        collegeFilter={collegeFilter}
        onCollegeChange={setCollegeFilter}
        showFavourites={isAuthenticated && wishlist.length > 0}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        pickedCalendarDates={pickedCalendarDates}
        onDatesChange={setPickedCalendarDates}
        onClearAll={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
          className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          + List my formal
        </button>
      </Modal>
    </>
  );
}
