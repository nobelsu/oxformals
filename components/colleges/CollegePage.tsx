"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { CollegeCrest, collegeColours } from "@/components/colleges/CollegeCrest";
import { CollegeGuide } from "@/components/colleges/CollegeGuide";
import { CollegeListingsSection } from "@/components/colleges/CollegeListingsSection";
import { CollegePhotosSection } from "@/components/colleges/CollegePhotosSection";
import { CollegeReviewCard } from "@/components/colleges/CollegeReviewCard";
import { StarRating } from "@/components/colleges/StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonRows } from "@/components/ui/Loading";
import type { AvatarSource } from "@/lib/auth/types";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewSort,
} from "@/lib/data/collegeReviews";

type Props = {
  college: string;
};

function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase leading-none tracking-wide">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "var(--accent)" : "none"} stroke={filled ? "var(--accent)" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

/**
 * A college, pilot edition: leads with what every college has (its crest,
 * who wants to go, formals coming up, the people there) and lets its own
 * students fill in a guide; reviews and photos join as they arrive.
 */
export function CollegePage({ college }: Props) {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<CollegeReviewSort>("top");
  const overview = useQuery(api.collegeDirectory.getOverview, { college });
  const aggregates = useQuery(api.collegeReviews.getCollegeAggregates, { college });
  const reviews = useQuery(api.collegeReviews.listReviewsForCollege, { college, sort, limit: 30 });
  const toggleWishlist = useMutation(api.users.toggleWishlistCollege);
  const [wishOverride, setWishOverride] = useState<boolean | null>(null);

  // Keep the last list on screen while a new sort loads.
  const [lastReviews, setLastReviews] = useState(reviews);
  if (reviews !== undefined && reviews !== lastReviews) setLastReviews(reviews);
  const reviewsToShow = reviews ?? lastReviews;

  // Deep links like ?section=listings (from the feed's college bubbles).
  const sectionParam = searchParams.get("section");
  useEffect(() => {
    if (!sectionParam) return;
    const el = document.getElementById(sectionParam);
    if (el) el.scrollIntoView({ block: "start" });
  }, [sectionParam]);

  const [c1, c2] = collegeColours(college);
  const wished = wishOverride ?? overview?.onMyWishlist ?? false;
  const averages = aggregates?.averages;
  const rating = averages ? averages.overall : null;

  const subline = [
    overview && overview.wantCount > 0 ? `${overview.wantCount} want to go` : null,
    rating !== null && aggregates ? `★ ${rating.toFixed(1)} (${aggregates.reviewCount})` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const headerLoading = overview === undefined || aggregates === undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Link href="/?tab=colleges" className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
          ← Colleges
        </Link>

        <div className="mt-3 overflow-hidden rounded-[22px] border-[2px] border-[var(--ink)] bg-[var(--paper)]">
          <div
            className="relative h-24 border-b-[2px] border-[var(--ink)] sm:h-28"
            style={{ background: `repeating-linear-gradient(90deg, ${c1} 0 36px, ${c2} 36px 48px)` }}
          >
            {isAuthenticated ? (
              <button
                type="button"
                aria-pressed={wished}
                onClick={() => {
                  setWishOverride(!wished);
                  void toggleWishlist({ college }).finally(() => setWishOverride(null));
                }}
                className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--bg)]"
              >
                <HeartIcon filled={wished} />
                {wished ? "On your wishlist" : "Want to go"}
              </button>
            ) : null}
          </div>
          <div className="relative flex items-end gap-4 px-5 pb-5">
            <div className="-mt-12 rounded-2xl bg-[var(--paper)] p-1">
              <CollegeCrest college={college} size={84} />
            </div>
            <div className="min-w-0 pb-1 pt-4">
              <h1 className="font-display text-4xl uppercase leading-none tracking-wide">{college}</h1>
              {/* The line keeps its height while the figures load, then fades
                  in, so nothing jumps. */}
              <p className="mt-2 h-5 text-sm text-[var(--ink-muted)]">
                {headerLoading ? (
                  <Skeleton className="h-3.5 w-40" />
                ) : (
                  <span className="fade-in">{subline}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Section id="guide" title="The guide">
        <CollegeGuide college={college} />
      </Section>

      <Section id="photos" title="Photos">
        <CollegePhotosSection college={college} />
      </Section>

      <Section id="listings" title="Upcoming formals">
        <CollegeListingsSection college={college} />
      </Section>

      <Section
        id="reviews"
        title="Reviews"
        aside={
          reviewsToShow && reviewsToShow.length > 1 ? (
            <div className="flex gap-1.5">
              {(["top", "recent"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] px-3 py-1 text-xs transition-colors ${
                    sort === s ? "bg-[var(--ink)] text-[var(--bg)]" : "hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                  }`}
                >
                  {s === "top" ? "Top" : "Recent"}
                </button>
              ))}
            </div>
          ) : null
        }
      >
        {averages ? (
          <div className="mb-4 flex flex-col gap-2.5 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4">
            {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
              <StarRating key={cat.key} label={cat.label} value={averages[cat.key]} size="sm" />
            ))}
          </div>
        ) : null}
        {reviewsToShow === undefined ? (
          <SkeletonRows count={2} />
        ) : reviewsToShow.length === 0 ? (
          <EmptyState
            icon="star"
            title="No reviews yet"
            body={
              overview && overview.friendsBeen > 0
                ? `${overview.friendsBeen} of your friends ${overview.friendsBeen === 1 ? "has" : "have"} been. Ask them to leave one.`
                : "Be the first after a formal here."
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {reviewsToShow.map((review) => (
              <CollegeReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </Section>

      {overview && overview.memberCount > 0 ? (
        <Section id="people" title={`${college} on Oxformals`}>
          <div className="flex items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-3">
            <div className="flex -space-x-2.5">
              {overview.members.slice(0, 6).map((m) => (
                <Link key={m._id} href={`/profile/${m._id}`} title={m.name ?? undefined} className="rounded-full ring-2 ring-[var(--paper)]">
                  <Avatar name={m.name ?? "Member"} size="sm" source={m.avatar as AvatarSource | undefined} />
                </Link>
              ))}
            </div>
            <span className="text-sm text-[var(--ink-muted)]">
              {overview.memberCount} member{overview.memberCount === 1 ? "" : "s"}
            </span>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
