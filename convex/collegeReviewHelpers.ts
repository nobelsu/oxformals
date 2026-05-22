import type { Doc, Id } from "./_generated/dataModel";
import { canReviewCollegeListing } from "../lib/data/collegeReviewEligibility";
import { normalizeCollegeName } from "../lib/data/colleges";
import type { CollegeReviewCategory } from "../lib/data/collegeReviews";

export { normalizeCollegeName };

export type ReviewRatings = {
  food: number;
  atmosphere: number;
  value: number;
  overall: number;
};

const RATING_KEYS: (keyof ReviewRatings)[] = [
  "food",
  "atmosphere",
  "value",
  "overall",
];

export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function normalizeRatings(raw: Partial<ReviewRatings>): ReviewRatings {
  return {
    food: clampRating(raw.food ?? 1),
    atmosphere: clampRating(raw.atmosphere ?? 1),
    value: clampRating(raw.value ?? 1),
    overall: clampRating(raw.overall ?? 1),
  };
}

export function ratingForCategory(
  ratings: ReviewRatings,
  category: CollegeReviewCategory,
): number {
  return ratings[category];
}

export function averageRatings(reviews: Doc<"collegeReviews">[]): ReviewRatings | null {
  if (reviews.length === 0) return null;
  const sums: ReviewRatings = {
    food: 0,
    atmosphere: 0,
    value: 0,
    overall: 0,
  };
  for (const r of reviews) {
    for (const key of RATING_KEYS) {
      sums[key] += r.ratings[key];
    }
  }
  const n = reviews.length;
  return {
    food: sums.food / n,
    atmosphere: sums.atmosphere / n,
    value: sums.value / n,
    overall: sums.overall / n,
  };
}

export function getReviewEligibility(
  user: Doc<"users"> | null,
  listing: Doc<"listings">,
  userId: Id<"users"> | null,
  nowMs: number,
  hasExistingReview: boolean,
): ReturnType<typeof canReviewCollegeListing> {
  if (!userId || !user) {
    return canReviewCollegeListing(null, listing, nowMs, { hasExistingReview });
  }
  return canReviewCollegeListing(
    { id: userId, college: user.college },
    {
      college: listing.college,
      dateTime: listing.dateTime,
      members: listing.members.map(String),
    },
    nowMs,
    { hasExistingReview },
  );
}

export const MAX_REVIEW_COMMENT_LENGTH = 2000;
