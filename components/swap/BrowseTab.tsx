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
import { ListingDayList } from "./ListingDayList";
import { ListingDetailModal } from "./ListingDetailModal";
import { ListingRow } from "./ListingRow";
import { JoinRequestFlow } from "./JoinRequestFlow";
import { isoToOxfordDateKey } from "@/lib/data/format";
import { BrowseFiltersModal } from "./BrowseFiltersModal";
import {
  BROWSE_FILTER_PARAMS,
  activeFilterSections,
  browseFilterPredicate,
  parseBrowseFilters,
  writeBrowseFilters,
  type BrowseFilters,
} from "@/lib/data/browseFilters";
import { MAX_GUESTS } from "@/convex/seats";
import type { Listing } from "@/lib/data/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNowMs } from "@/lib/hooks/useNowMs";

type Props = {
  onNavigateToMine: () => void;
  onNavigateToRequests: () => void;
  onSignInRequired: () => void;
};

const FILTER_FIELD_CLS =
  "min-w-0 origin-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base transition-colors focus:outline-none focus:bg-[var(--paper)]";

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

function FilterCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden
      className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold leading-none text-[var(--accent-ink)] ring-2 ring-[var(--bg)]"
    >
      {count}
    </span>
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
  const { listings, wishlist, getUser, getListing } = useData();
  const nowMs = useNowMs();

  // Filters live in the URL (`?when=week&how=swap…`) so a filtered browse
  // survives reloads and can be shared.
  const filters = useMemo(
    () => parseBrowseFilters(searchParams, MAX_GUESTS),
    [searchParams],
  );
  const setFilters = useCallback(
    (next: BrowseFilters) => {
      const params = writeBrowseFilters(
        new URLSearchParams(searchParams.toString()),
        next,
      );
      params.set("tab", "browse");
      params.delete("listing");
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
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
  const [joinTarget, setJoinTarget] = useState<Listing | null>(null);

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

  const wishlistSet = useMemo(
    () => new Set(isAuthenticated ? wishlist : []),
    [isAuthenticated, wishlist],
  );

  // Open, upcoming and not the viewer's own.
  const openListings = useMemo(
    () =>
      listings
        .filter((l) => l.status === "active")
        .filter((l) => Date.parse(l.dateTime) > nowMs)
        .filter((l) => !user || l.ownerUserId !== user.id),
    [listings, user, nowMs],
  );

  const searchedListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return openListings;
    return openListings.filter((l) => {
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
    });
  }, [openListings, searchQuery, getUser]);

  // One predicate builder feeds both the list and the sheet's live count.
  const countFor = useCallback(
    (f: BrowseFilters) => {
      const pass = browseFilterPredicate(f, {
        todayKey: isoToOxfordDateKey(new Date(nowMs).toISOString()),
        dateKeyOf: (l) => isoToOxfordDateKey(l.dateTime),
        wishlist: wishlistSet,
      });
      return searchedListings.filter(pass);
    },
    [searchedListings, wishlistSet, nowMs],
  );

  const browseListings = useMemo(
    () =>
      countFor(filters).sort(
        (a, b) => +new Date(a.dateTime) - +new Date(b.dateTime),
      ),
    [countFor, filters],
  );

  const activeSections = activeFilterSections(filters);

  function clearAllFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of BROWSE_FILTER_PARAMS) params.delete(key);
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  const hasCollegeMatches = openListings.length > 0;

  function handleRequestClick(listing: Listing) {
    if (!isAuthenticated) {
      onSignInRequired();
      return;
    }
    setJoinTarget(listing);
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 border-b border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pb-3">
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
                aria-label={activeSections ? `Filters, ${activeSections} on` : "Filters"}
                aria-expanded={filterOpen}
                className="relative hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)]/25 bg-[var(--paper)] text-[var(--ink)] transition-colors hover:border-[var(--ink)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30 sm:flex"
              >
                <FilterIcon className="h-5 w-5" />
                <FilterCountBadge count={activeSections} />
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
              aria-label={activeSections ? `Filters, ${activeSections} on` : "Filters"}
              aria-expanded={filterOpen}
              className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30"
            >
              <FilterIcon className="h-5 w-5" />
              <FilterCountBadge count={activeSections} />
            </button>
          </div>
        </div>
        </div>

        {browseListings.length === 0 ? (
          <div className="mx-auto w-full max-w-3xl">
            {hasCollegeMatches ? (
              <EmptyState
                icon="search"
                title="No matches"
                body={activeSections > 0 ? "Try fewer filters." : "Try another search."}
                action={
                  activeSections > 0
                    ? { label: "Clear filters", onClick: clearAllFilters }
                    : undefined
                }
              />
            ) : (
              <EmptyState
                icon="ticket"
                title="No open formals here"
                action={{ label: "List yours", href: "/?tab=requests&openList=1" }}
              />
            )}
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
        value={filters}
        onApply={setFilters}
        countFor={(f) => countFor(f).length}
        showWantToGo={isAuthenticated && wishlist.length > 0}
        maxGuests={MAX_GUESTS}
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
      />

      <JoinRequestFlow
        target={joinTarget}
        onClose={() => setJoinTarget(null)}
        onNavigateToRequests={onNavigateToRequests}
      />
    </>
  );
}
