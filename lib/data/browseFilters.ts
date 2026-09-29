import type { FormalType, Listing } from "./types";

/**
 * Browse filters: what the filter sheet picks, how it round-trips through the
 * URL, and which listings pass. Pure so the sheet's live "Show N" count and
 * the list itself share one definition.
 */

export type WhenPreset = "tonight" | "week" | "weekend" | "dates";
/** Credit is accepted on every listing, so only swap and pay narrow the list. */
export type HowOption = "swap" | "pay";

export type BrowseFilters = {
  when: WhenPreset | null;
  /** `YYYY-MM-DD` days, used when `when` is "dates". */
  dates: string[];
  colleges: string[];
  /** Include the viewer's Want to go colleges. */
  wantToGo: boolean;
  how: HowOption[];
  /** People the viewer is bringing; a listing needs 1 + guests free seats. */
  guests: number;
  types: FormalType[];
  role: string | null;
};

export const EMPTY_BROWSE_FILTERS: BrowseFilters = {
  when: null,
  dates: [],
  colleges: [],
  wantToGo: false,
  how: [],
  guests: 0,
  types: [],
  role: null,
};

export const WHEN_PRESETS: WhenPreset[] = ["tonight", "week", "weekend", "dates"];
export const HOW_OPTIONS: HowOption[] = ["swap", "pay"];
export const FORMAL_TYPES: FormalType[] = ["social", "matchmaking", "networking"];

/** Every URL param the filters own (so callers can clear them in one go). */
export const BROWSE_FILTER_PARAMS = [
  "when",
  "dates",
  "colleges",
  "want",
  "how",
  "seats",
  "type",
  "role",
] as const;

type ParamReader = { get(name: string): string | null };

function list(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

export function parseBrowseFilters(
  params: ParamReader,
  maxGuests: number,
): BrowseFilters {
  const whenRaw = params.get("when");
  const when = (WHEN_PRESETS as string[]).includes(whenRaw ?? "")
    ? (whenRaw as WhenPreset)
    : null;
  const guests = Number.parseInt(params.get("seats") ?? "", 10);
  return {
    when,
    dates:
      when === "dates"
        ? unique(list(params.get("dates")).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).sort()
        : [],
    colleges: unique(list(params.get("colleges"))),
    wantToGo: params.get("want") === "1",
    how: unique(list(params.get("how"))).filter((h): h is HowOption =>
      (HOW_OPTIONS as string[]).includes(h),
    ),
    guests: Number.isFinite(guests)
      ? Math.min(Math.max(0, guests), maxGuests)
      : 0,
    types: unique(list(params.get("type"))).filter((t): t is FormalType =>
      (FORMAL_TYPES as string[]).includes(t),
    ),
    role: params.get("role") || null,
  };
}

/** Writes `filters` onto `params`, dropping any that are unset. */
export function writeBrowseFilters(
  params: URLSearchParams,
  filters: BrowseFilters,
): URLSearchParams {
  for (const key of BROWSE_FILTER_PARAMS) params.delete(key);
  if (filters.when) params.set("when", filters.when);
  if (filters.when === "dates" && filters.dates.length > 0) {
    params.set("dates", filters.dates.join(","));
  }
  if (filters.colleges.length > 0) params.set("colleges", filters.colleges.join(","));
  if (filters.wantToGo) params.set("want", "1");
  if (filters.how.length > 0) params.set("how", filters.how.join(","));
  if (filters.guests > 0) params.set("seats", String(filters.guests));
  if (filters.types.length > 0) params.set("type", filters.types.join(","));
  if (filters.role) params.set("role", filters.role);
  return params;
}

/** Sections with something picked — the count on the filter button. */
export function activeFilterSections(filters: BrowseFilters): number {
  let n = 0;
  if (filters.when && (filters.when !== "dates" || filters.dates.length > 0)) n++;
  if (filters.colleges.length > 0 || filters.wantToGo) n++;
  if (filters.how.length > 0) n++;
  if (filters.guests > 0) n++;
  if (filters.types.length > 0) n++;
  if (filters.role) n++;
  return n;
}

function keyToUtcNoon(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function addDays(key: string, days: number): string {
  const d = keyToUtcNoon(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(key: string): number {
  return (keyToUtcNoon(key).getUTCDay() + 6) % 7;
}

/**
 * The Oxford days a "When" pick covers, given today's Oxford date key, or
 * null when it doesn't narrow anything. Weeks run Monday to Sunday.
 */
export function whenDateKeys(
  when: WhenPreset | null,
  dates: string[],
  todayKey: string,
): Set<string> | null {
  switch (when) {
    case null:
      return null;
    case "tonight":
      return new Set([todayKey]);
    case "week": {
      const out = new Set<string>();
      for (let i = 0; i <= 6 - mondayIndex(todayKey); i++) out.add(addDays(todayKey, i));
      return out;
    }
    case "weekend": {
      const idx = mondayIndex(todayKey);
      const saturday = addDays(todayKey, 5 - idx);
      if (idx === 6) return new Set([todayKey]);
      if (idx === 5) return new Set([todayKey, addDays(todayKey, 1)]);
      return new Set([saturday, addDays(saturday, 1)]);
    }
    case "dates":
      return dates.length > 0 ? new Set(dates) : null;
  }
}

export type FilterContext = {
  /** Oxford `YYYY-MM-DD` for today. */
  todayKey: string;
  /** Oxford `YYYY-MM-DD` of a listing (injected so this stays timezone-free). */
  dateKeyOf: (listing: Listing) => string;
  /** The viewer's Want to go colleges (empty when signed out). */
  wishlist: ReadonlySet<string>;
};

/** Builds a predicate for `filters`; listings pass when every section matches. */
export function browseFilterPredicate(
  filters: BrowseFilters,
  ctx: FilterContext,
): (listing: Listing) => boolean {
  const days = whenDateKeys(filters.when, filters.dates, ctx.todayKey);
  const colleges = new Set(filters.colleges);
  const useWishlist = filters.wantToGo && ctx.wishlist.size > 0;
  const whereActive = colleges.size > 0 || useWishlist;
  const how = new Set(filters.how);
  const types = new Set(filters.types);
  const seatsNeeded = 1 + filters.guests;

  return (l) => {
    if (days && !days.has(ctx.dateKeyOf(l))) return false;
    if (
      whereActive &&
      !colleges.has(l.college) &&
      !(useWishlist && ctx.wishlist.has(l.college))
    ) {
      return false;
    }
    if (how.size > 0) {
      const swaps = l.listingType === "swap" || l.listingType === "both";
      const pays = l.listingType === "pay" || l.listingType === "both";
      if (!((how.has("swap") && swaps) || (how.has("pay") && pays))) return false;
    }
    if (l.seatsAvailable < seatsNeeded) return false;
    if (types.size > 0 && !types.has(l.formalType)) return false;
    if (filters.role && l.role !== filters.role) return false;
    return true;
  };
}

/** "Just me", "Me + 1" … */
export function guestsLabel(guests: number): string {
  return guests === 0 ? "Just me" : `Me + ${guests}`;
}
