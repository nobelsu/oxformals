"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/useAuth";
import { CollegeReviewEditor } from "@/components/colleges/CollegeReviewEditor";
import { ReviewImageGallery } from "@/components/colleges/ReviewImageGallery";
import { StarRating } from "@/components/colleges/StarRating";
import { SketchCard } from "@/components/ui/SketchCard";
import {
  applyVoteToggle,
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewVoteState,
} from "@/lib/data/collegeReviews";
import type { CollegeReviewPublic } from "@/lib/data/collegeReviews";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { formatListingDate } from "@/lib/data/format";

type Props = {
  review: CollegeReviewPublic;
  /** On profile pages, show the college reviewed instead of the author. */
  variant?: "default" | "profile";
};

export function CollegeReviewCard({ review, variant = "default" }: Props) {
  const [ratingsExpanded, setRatingsExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [optimisticVote, setOptimisticVote] =
    useState<CollegeReviewVoteState | null>(null);
  const { isAuthenticated, user } = useAuth();
  const voteReview = useMutation(api.collegeReviews.voteReview);

  const isOwnReview =
    isAuthenticated && user !== null && review.author?.userId === user.id;
  const canVote = isAuthenticated && !isOwnReview;

  const serverVote: CollegeReviewVoteState = {
    voteScore: review.voteScore,
    viewerVote: review.viewerVote,
  };
  const voteState =
    optimisticVote &&
    (optimisticVote.voteScore !== serverVote.voteScore ||
      optimisticVote.viewerVote !== serverVote.viewerVote)
      ? optimisticVote
      : serverVote;

  function handleVote(direction: "up" | "down") {
    if (!canVote) return;
    const previous = optimisticVote;
    const next = applyVoteToggle(voteState, direction);
    setOptimisticVote(next);
    void voteReview({
      reviewId: review.id as Id<"collegeReviews">,
      direction,
      nowMs: Date.now(),
    }).catch(() => {
      setOptimisticVote(previous);
    });
  }

  return (
    <SketchCard className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {variant === "profile" ? (
          <Link
            href={`/college/${collegeToSlug(review.college)}`}
            className="font-display text-lg uppercase tracking-wide hover:underline"
          >
            {review.college}
          </Link>
        ) : review.author ? (
          <Link
            href={`/profile/${review.author.userId}`}
            className="text-sm hover:underline"
          >
            {review.author.name}
            {review.author.college ? ` · ${review.author.college}` : ""}
          </Link>
        ) : (
          <span className="text-sm text-[var(--ink-soft)]">Anonymous</span>
        )}
        <p className="text-sm text-[var(--ink-muted)]">
          {formatListingDate(review.formalDateTime)}
        </p>
      </div>

      {editing ? (
        <div className="mt-3">
          <CollegeReviewEditor
            review={review}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setRatingsExpanded((v) => !v)}
              aria-expanded={ratingsExpanded}
              aria-label={ratingsExpanded ? "Hide ratings" : "Show ratings"}
              className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <span>Ratings</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 12 8"
                className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                  ratingsExpanded ? "rotate-180" : ""
                }`}
                fill="none"
              >
                <path
                  d="M1 1.5 6 6.5 11 1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {ratingsExpanded ? (
              <div className="mt-2 flex flex-col gap-2">
                {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                  <StarRating
                    key={cat.key}
                    label={cat.label}
                    value={review.ratings[cat.key]}
                    size="sm"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {review.comment ? (
            <p className="mt-3 text-sm italic text-[var(--ink-muted)]">
              &ldquo;{review.comment}&rdquo;
            </p>
          ) : null}

          {review.imageUrls && review.imageUrls.length > 0 ? (
            <ReviewImageGallery imageUrls={review.imageUrls} />
          ) : null}

          {isOwnReview ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-4 w-fit rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Edit review
            </button>
          ) : null}
        </>
      )}

      {!isOwnReview && !editing ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleVote("up")}
            disabled={!canVote}
            aria-pressed={voteState.viewerVote === 1}
            aria-label="Upvote review"
            className={`cursor-pointer rounded-full border-[2px] px-2.5 py-1 text-sm leading-none transition-[colors,transform] duration-150 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${
              voteState.viewerVote === 1
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:opacity-90"
                : "border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            }`}
          >
            ▲
          </button>
          <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
            {voteState.voteScore}
          </span>
          <button
            type="button"
            onClick={() => handleVote("down")}
            disabled={!canVote}
            aria-pressed={voteState.viewerVote === -1}
            aria-label="Downvote review"
            className={`cursor-pointer rounded-full border-[2px] px-2.5 py-1 text-sm leading-none transition-[colors,transform] duration-150 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${
              voteState.viewerVote === -1
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:opacity-90"
                : "border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            }`}
          >
            ▼
          </button>
        </div>
      ) : null}
    </SketchCard>
  );
}
