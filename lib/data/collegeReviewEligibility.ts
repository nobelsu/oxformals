import { normalizeCollegeName } from "./colleges";

export type ReviewEligibilityListing = {
  college: string;
  dateTime: string;
  members: string[];
};

export type ReviewEligibilityUser = {
  id: string;
  college?: string;
};

export type ReviewEligibilityResult = {
  canReview: boolean;
  isPast: boolean;
  reason?: string;
};

export function listingIsPast(dateTime: string, nowMs: number): boolean {
  const t = Date.parse(dateTime);
  if (Number.isNaN(t)) return false;
  return t <= nowMs;
}

/** True when the user is visiting another college's formal (not the host college). */
export function isGuestForCollegeListing(
  user: ReviewEligibilityUser | null | undefined,
  listingCollege: string,
): boolean {
  if (!user) return false;
  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listingCollege);
  return !(home && host && home === host);
}

export function canReviewCollegeListing(
  user: ReviewEligibilityUser | null | undefined,
  listing: ReviewEligibilityListing,
  nowMs: number,
  options?: { hasExistingReview?: boolean },
): ReviewEligibilityResult {
  const isPast = listingIsPast(listing.dateTime, nowMs);
  if (!user) {
    return { canReview: false, isPast, reason: "Sign in to rate this formal." };
  }
  if (!listing.members.includes(user.id)) {
    return {
      canReview: false,
      isPast,
      reason: "Only group members can rate this formal.",
    };
  }
  if (!isPast) {
    return {
      canReview: false,
      isPast,
      reason: "You can rate this formal after it has taken place.",
    };
  }
  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listing.college);
  if (home && host && home === host) {
    return {
      canReview: false,
      isPast,
      reason: "You cannot review your own college's formal.",
    };
  }
  if (options?.hasExistingReview) {
    return { canReview: false, isPast, reason: "You already reviewed this formal." };
  }
  return { canReview: true, isPast };
}
