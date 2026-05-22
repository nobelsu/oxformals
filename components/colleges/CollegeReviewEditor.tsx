"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StarRating } from "@/components/colleges/StarRating";
import { Modal } from "@/components/ui/Modal";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewPublic,
  type CollegeReviewRatings,
} from "@/lib/data/collegeReviews";
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

function draftFromReview(review: CollegeReviewPublic): {
  ratings: CollegeReviewRatings;
  comment: string;
  imageDrafts: ReviewImageDraft[];
} {
  const ids = review.imageIds ?? [];
  const urls = review.imageUrls ?? [];
  return {
    ratings: review.ratings,
    comment: review.comment ?? "",
    imageDrafts: ids.map((storageId, i) => ({
      storageId: storageId as Id<"_storage">,
      previewUrl: urls[i] ?? "",
      fileName: `Photo ${i + 1}`,
    })),
  };
}

type Props = {
  review: CollegeReviewPublic;
  onSaved: () => void;
  onCancel: () => void;
};

export function CollegeReviewEditor({ review, onSaved, onCancel }: Props) {
  const initial = draftFromReview(review);
  const [draft, setDraft] = useState<CollegeReviewRatings>(initial.ratings);
  const [comment, setComment] = useState(initial.comment);
  const [imageDrafts, setImageDrafts] = useState<ReviewImageDraft[]>(
    initial.imageDrafts,
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const updateReview = useMutation(api.collegeReviews.updateReview);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const resetDraft = useCallback(() => {
    const next = draftFromReview(review);
    setDraft(next.ratings);
    setComment(next.comment);
    setImageDrafts(next.imageDrafts);
    setImageError(null);
    setError(null);
  }, [review]);

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
    const imageIds =
      imageDrafts.length > 0 ? imageDrafts.map((d) => d.storageId) : undefined;
    try {
      await updateReview({
        reviewId: review.id as Id<"collegeReviews">,
        nowMs: Date.now(),
        ratings: draft,
        comment: comment || undefined,
        imageIds,
        isAnonymous: postAnonymously,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
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
    <>
      <div className="flex flex-col">
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
            className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              resetDraft();
              onCancel();
            }}
            className="rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <Modal
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Save review?"
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
            className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
    </>
  );
}
