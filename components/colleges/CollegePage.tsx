"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { CollegeOverallRank } from "@/components/colleges/CollegeOverallRank";
import { CollegeListingsSection } from "@/components/colleges/CollegeListingsSection";
import {
  CollegePhotosSection,
  countReviewPhotos,
} from "@/components/colleges/CollegePhotosSection";
import { CollegePageNav } from "@/components/colleges/CollegePageNav";
import { CollegeReviewCard } from "@/components/colleges/CollegeReviewCard";
import { StarRating } from "@/components/colleges/StarRating";
import { useCollegePageSection } from "@/components/colleges/useCollegePageSection";
import { SketchCard } from "@/components/ui/SketchCard";
import { mapListing } from "@/lib/data/mapConvex";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewSort,
} from "@/lib/data/collegeReviews";

type Props = {
  college: string;
};

function formatStatsLine(
  attendanceCount: number,
  completedFormalCount: number,
  reviewCount: number,
): string {
  const parts: string[] = [];
  if (attendanceCount > 0) {
    parts.push(
      `${attendanceCount} ${attendanceCount === 1 ? "guest" : "guests"} attended`,
    );
  }
  if (completedFormalCount > 0) {
    parts.push(
      `${completedFormalCount} completed ${completedFormalCount === 1 ? "formal" : "formals"}`,
    );
  }
  parts.push(`${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`);
  return parts.join(" · ");
}

export function CollegePage({ college }: Props) {
  const { user } = useAuth();
  const { section, setSection } = useCollegePageSection(college);
  const [sort, setSort] = useState<CollegeReviewSort>("top");

  const aggregates = useQuery(api.collegeReviews.getCollegeAggregates, {
    college,
  });
  const reviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college,
    sort,
    limit: 30,
  });
  const reviewsForPhotos = useQuery(api.collegeReviews.listReviewsForCollege, {
    college,
    sort: "recent",
    limit: 100,
  });
  const rawListings = useQuery(api.listings.listActiveListingsForCollege, {
    college,
  });

  const cachedReviews = useRef(reviews);
  if (reviews !== undefined) {
    cachedReviews.current = reviews;
  }
  const reviewsToShow = reviews ?? cachedReviews.current;

  const photosCount = useMemo(
    () => countReviewPhotos(reviewsForPhotos),
    [reviewsForPhotos],
  );

  const listingsCount = useMemo(() => {
    if (rawListings === undefined) return null;
    const now = Date.now();
    return rawListings
      .map(mapListing)
      .filter((l) => Date.parse(l.dateTime) > now)
      .filter((l) => !user || l.ownerUserId !== user.id).length;
  }, [rawListings, user]);

  const averages = aggregates?.averages;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/?tab=colleges"
          className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          ← Colleges
        </Link>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide">
          {college}
        </h1>
        {aggregates !== undefined ? (
          <>
            <p className="mt-1 text-[var(--ink-muted)]">
              {formatStatsLine(
                aggregates.attendanceCount,
                aggregates.completedFormalCount,
                aggregates.reviewCount,
              )}
            </p>
            <CollegeOverallRank rank={aggregates.rank} />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <CollegePageNav
          section={section}
          onSectionChange={setSection}
          counts={{ photos: photosCount, listings: listingsCount }}
        />

        <div className="min-w-0 flex-1">
          {section === "photos" ? (
            <section>
              <h2 className="font-display text-2xl uppercase tracking-wide">
                Photos
              </h2>
              <div className="mt-4">
                <CollegePhotosSection college={college} />
              </div>
            </section>
          ) : section === "reviews" ? (
            <div className="flex flex-col gap-8">
              {averages ? (
                <SketchCard className="p-6">
                  <h2 className="font-display text-xl uppercase tracking-wide">
                    Average ratings
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                      <StarRating
                        key={cat.key}
                        label={cat.label}
                        value={averages[cat.key]}
                        size="sm"
                      />
                    ))}
                  </div>
                </SketchCard>
              ) : aggregates !== undefined ? (
                <SketchCard className="p-6 text-[var(--ink-muted)]">
                  No reviews yet. Be the first after attending a formal here.
                </SketchCard>
              ) : null}

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl uppercase tracking-wide">
                    Reviews
                  </h2>
                  <div className="flex gap-2">
                    {(["top", "recent"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSort(s)}
                        className={`cursor-pointer rounded-full border-[2px] px-3 py-1 text-sm transition-colors ${
                          sort === s
                            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                            : "border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                        }`}
                      >
                        {s === "top" ? "Top rated" : "Most recent"}
                      </button>
                    ))}
                  </div>
                </div>

                {reviewsToShow === undefined ? (
                  <p className="mt-4 text-[var(--ink-muted)]">Loading reviews…</p>
                ) : reviewsToShow.length === 0 ? (
                  <p className="mt-4 text-[var(--ink-muted)]">No reviews yet.</p>
                ) : (
                  <div className="mt-4 flex flex-col gap-4">
                    {reviewsToShow.map((review) => (
                      <CollegeReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : section === "listings" ? (
            <section>
              <h2 className="font-display text-2xl uppercase tracking-wide">
                Listings
              </h2>
              <div className="mt-4">
                <CollegeListingsSection college={college} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
