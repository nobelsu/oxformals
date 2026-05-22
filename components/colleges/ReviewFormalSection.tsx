"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/useAuth";
import { StarRating } from "@/components/colleges/StarRating";
import { SketchCard } from "@/components/ui/SketchCard";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewRatings,
} from "@/lib/data/collegeReviews";
import { isGuestForCollegeListing } from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/lib/hooks/useNowMs";

const EMPTY_RATINGS: CollegeReviewRatings = {
  food: 0,
  atmosphere: 0,
  value: 0,
  overall: 0,
};

type Props = {
  listingId: string;
  college: string;
};

export function ReviewFormalSection({ listingId, college }: Props) {
  const { isAuthenticated, user } = useAuth();
  const nowMs = useNowMs();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const state = useQuery(
    api.collegeReviews.getListingReviewState,
    isAuthenticated
      ? { listingId: listingId as Id<"listings">, nowMs }
      : "skip",
  );

  const submitReview = useMutation(api.collegeReviews.submitReview);
  const updateReview = useMutation(api.collegeReviews.updateReview);
  const reportReview = useMutation(api.collegeReviews.reportReview);

  const [draft, setDraft] = useState<CollegeReviewRatings>(EMPTY_RATINGS);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const resetDraftFromReview = useCallback(
    (review: NonNullable<typeof state>["existingReview"]) => {
      if (!review) return;
      setDraft(review.ratings);
      setComment(review.comment ?? "");
      setIsAnonymous(review.isAnonymous);
    },
    [],
  );

  const ratingsComplete = useMemo(
    () => COLLEGE_REVIEW_CATEGORIES.every((c) => draft[c.key] >= 1),
    [draft],
  );

  if (isAuthenticated && user && !isGuestForCollegeListing(user, college)) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <SketchCard className="p-5">
        <h3 className="font-display text-lg uppercase tracking-wide">Rate this formal</h3>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to rate your experience at {college}.
        </p>
      </SketchCard>
    );
  }

  if (state === undefined) {
    return (
      <SketchCard className="p-5 text-sm text-[var(--ink-muted)]">Loading review…</SketchCard>
    );
  }

  const existing = state.existingReview;
  const showForm = state.canReview || (existing && editing);

  async function handleSubmit() {
    if (!ratingsComplete) {
      setError("Please rate every category.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (existing && editing) {
        await updateReview({
          reviewId: existing.id as Id<"collegeReviews">,
          nowMs: Date.now(),
          ratings: draft,
          comment: comment || undefined,
          isAnonymous,
        });
        setSuccess("Review updated.");
        setEditing(false);
      } else {
        await submitReview({
          listingId: listingId as Id<"listings">,
          nowMs: Date.now(),
          ratings: draft,
          comment: comment || undefined,
          isAnonymous,
        });
        setSuccess("Thanks for your review!");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport() {
    if (!existing) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportReview({
        reviewId: existing.id as Id<"collegeReviews">,
        nowMs: Date.now(),
      });
      setReported(true);
      setSuccess("Thanks — we'll look into it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state.isPast && !existing) {
    return null;
  }

  return (
    <SketchCard className="p-5">
      <h3 className="font-display text-lg uppercase tracking-wide">Rate this formal</h3>

      {existing && !editing ? (
        <div className="mt-4 flex flex-col gap-3">
          {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
            <StarRating
              key={cat.key}
              label={cat.label}
              value={existing.ratings[cat.key]}
              size="sm"
            />
          ))}
          {existing.comment ? (
            <p className="text-sm italic text-[var(--ink-muted)]">
              &ldquo;{existing.comment}&rdquo;
            </p>
          ) : null}
          <p className="text-xs text-[var(--ink-soft)]">
            {existing.isAnonymous
              ? "Posted anonymously"
              : existing.author
                ? `${existing.author.name} · ${existing.author.college}`
                : "Your review"}
          </p>
          {existing.author?.userId === user?.id || !existing.author ? (
            <button
              type="button"
              onClick={() => {
                resetDraftFromReview(existing);
                setEditing(true);
              }}
              className="w-fit rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Edit review
            </button>
          ) : (
            <button
              type="button"
              disabled={reported || submitting}
              onClick={() => void handleReport()}
              className="w-fit rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
            >
              {reported ? "Reported" : "Report review"}
            </button>
          )}
        </div>
      ) : showForm ? (
        <div className="mt-4 flex flex-col gap-3">
          {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
            <StarRating
              key={cat.key}
              label={cat.label}
              value={draft[cat.key]}
              onChange={(n) => setDraft((prev) => ({ ...prev, [cat.key]: n }))}
              size="sm"
            />
          ))}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--ink-muted)]">Comment (optional)</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-lg border-[2px] border-[var(--ink)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="Food, atmosphere, value tips…"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>Post anonymously</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={submitting || !ratingsComplete}
              onClick={() => void handleSubmit()}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {submitting ? "Saving…" : existing ? "Save changes" : "Submit review"}
            </button>
            {editing ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                className="rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{state.reason}</p>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-[var(--ink-muted)]">{success}</p> : null}
    </SketchCard>
  );
}
