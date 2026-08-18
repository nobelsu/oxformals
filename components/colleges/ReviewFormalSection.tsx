"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/useAuth";
import { ConfirmAttendanceSection } from "@/components/colleges/ConfirmAttendanceSection";
import { CollegeReviewEditor } from "@/components/colleges/CollegeReviewEditor";
import { ReviewImageGallery } from "@/components/colleges/ReviewImageGallery";
import { StarRating } from "@/components/colleges/StarRating";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewRatings,
} from "@/lib/data/collegeReviews";
import { isGuestForCollegeListing } from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/lib/hooks/useNowMs";
import {
  IMAGE_FILE_ACCEPT,
  uploadImageFile,
  validateImageFile,
} from "@/lib/upload/imageFile";

const MAX_REVIEW_IMAGES = 3;

const EMPTY_RATINGS: CollegeReviewRatings = {
  food: 0,
  atmosphere: 0,
  value: 0,
  overall: 0,
};

type ReviewImageDraft = {
  storageId: Id<"_storage">;
  previewUrl: string;
  fileName?: string;
};

type Props = {
  listingId: string;
  college: string;
};

function ReviewFormSection({
  title,
  optional = false,
  className,
  children,
}: {
  title: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col gap-3 border-t border-[var(--ink)]/12 pt-4 first:border-t-0 first:pt-0${className ? ` ${className}` : ""}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h4 className="font-display text-sm uppercase tracking-wide text-[var(--ink)]">
          {title}
        </h4>
        {optional ? (
          <span className="text-xs text-[var(--ink-soft)]">Optional</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ReviewFormalSection({ listingId, college }: Props) {
  const { isAuthenticated, user } = useAuth();
  const nowMs = useNowMs();
  const [editing, setEditing] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
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
  const reportReview = useMutation(api.collegeReviews.reportReview);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<CollegeReviewRatings>(EMPTY_RATINGS);
  const [comment, setComment] = useState("");
  const [imageDrafts, setImageDrafts] = useState<ReviewImageDraft[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const ratingsComplete = useMemo(
    () => COLLEGE_REVIEW_CATEGORIES.every((c) => draft[c.key] >= 1),
    [draft],
  );

  const canAddImages = imageDrafts.length < MAX_REVIEW_IMAGES && !imageUploading;

  async function handleImageSelect(file: File) {
    if (imageDrafts.length >= MAX_REVIEW_IMAGES) {
      setImageError(`You can attach at most ${MAX_REVIEW_IMAGES} images.`);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setImageError(validationError);
      return;
    }

    setImageUploading(true);
    setImageError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const storageId = await uploadImageFile(file, generateUploadUrl);
      setImageDrafts((prev) => [
        ...prev,
        { storageId, previewUrl, fileName: file.name },
      ]);
    } catch (e) {
      URL.revokeObjectURL(previewUrl);
      setImageError(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function removeImageDraft(index: number) {
    setImageDrafts((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

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
  const showNewReviewForm = state.canReview && !existing;
  const needsAttendanceConfirm =
    !existing && state.canConfirmAttendance && !state.hasRespondedToAttendance;

  function openSubmitConfirm() {
    if (!ratingsComplete) {
      setError("Please rate every category.");
      return;
    }
    setError(null);
    setConfirmSubmitOpen(true);
  }

  async function handleConfirmSubmit(postAnonymously: boolean) {
    setConfirmSubmitOpen(false);
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const imageIds =
      imageDrafts.length > 0 ? imageDrafts.map((d) => d.storageId) : undefined;
    try {
      await submitReview({
        listingId: listingId as Id<"listings">,
        nowMs: Date.now(),
        ratings: draft,
        comment: comment || undefined,
        imageIds,
        isAnonymous: postAnonymously,
      });
      setSuccess("Thanks for your review!");
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

  if (needsAttendanceConfirm) {
    return (
      <ConfirmAttendanceSection listingId={listingId} college={college} />
    );
  }

  const imageUploadField = (
    <div className="flex flex-col gap-2">
      {imageDrafts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imageDrafts.map((img, index) => (
            <div key={img.storageId} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={img.fileName ?? `Photo ${index + 1}`}
                className="h-20 w-20 rounded-lg border-[2px] border-[var(--ink)] object-cover"
              />
              <button
                type="button"
                onClick={() => removeImageDraft(index)}
                disabled={imageUploading || submitting}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-xs leading-none disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={!canAddImages || submitting}
          className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {imageUploading ? "Uploading…" : "Add photo"}
        </button>
        <span className="text-xs text-[var(--ink-soft)]">
          {imageDrafts.length}/{MAX_REVIEW_IMAGES}
        </span>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageSelect(file);
        }}
      />
      {imageError ? <p className="text-sm text-red-600">{imageError}</p> : null}
    </div>
  );

  return (
    <SketchCard className="p-5">
      <h3 className="font-display text-lg uppercase tracking-wide">Rate this formal</h3>

      {existing && !editing ? (
        <div className="mt-5 flex flex-col">
          <ReviewFormSection title="Ratings" className="pb-6">
            <div className="flex flex-col gap-2.5">
              {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={existing.ratings[cat.key]}
                  size="sm"
                />
              ))}
            </div>
          </ReviewFormSection>
          {existing.comment ? (
            <ReviewFormSection title="Review">
              <p className="text-sm italic text-[var(--ink-muted)]">
                &ldquo;{existing.comment}&rdquo;
              </p>
            </ReviewFormSection>
          ) : null}
          {existing.imageUrls && existing.imageUrls.length > 0 ? (
            <ReviewFormSection title="Photos">
              <ReviewImageGallery imageUrls={existing.imageUrls} />
            </ReviewFormSection>
          ) : null}
          <p className="mt-4 border-t border-[var(--ink)]/12 pt-4 text-xs text-[var(--ink-soft)]">
            {existing.isAnonymous
              ? "Posted anonymously"
              : existing.author
                ? `${existing.author.name} · ${existing.author.college}`
                : "Your review"}
          </p>
          {existing.author?.userId === user?.id || !existing.author ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
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
      ) : existing && editing ? (
        <div className="mt-5">
          <CollegeReviewEditor
            review={existing}
            onSaved={() => {
              setEditing(false);
              setSuccess("Review updated.");
            }}
            onCancel={() => {
              setEditing(false);
              setError(null);
            }}
          />
        </div>
      ) : showNewReviewForm ? (
        <div className="mt-5 flex flex-col">
          <ReviewFormSection title="Ratings" className="pb-6">
            <div className="flex flex-col gap-2.5">
              {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={draft[cat.key]}
                  onChange={(n) => setDraft((prev) => ({ ...prev, [cat.key]: n }))}
                  size="sm"
                />
              ))}
            </div>
          </ReviewFormSection>
          <ReviewFormSection title="Review" optional>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              aria-label="Written review"
              className="w-full resize-y rounded-lg border-[2px] border-[var(--ink)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="Food, atmosphere, value tips…"
            />
          </ReviewFormSection>
          <ReviewFormSection title="Photos" optional>
            {imageUploadField}
          </ReviewFormSection>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting || !ratingsComplete || imageUploading}
              onClick={openSubmitConfirm}
              className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Submit review"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{state.reason}</p>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-[var(--ink-muted)]">{success}</p> : null}

      <Modal
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Submit review?"
        panelClassName="max-w-sm"
      >
        <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
          Would you like to post this review anonymously? Anonymous reviews
          won&apos;t show your name on college pages.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirmSubmit(true)}
            className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yes, post anonymously
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirmSubmit(false)}
            className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            No, show my name
          </button>
        </div>
      </Modal>
    </SketchCard>
  );
}
