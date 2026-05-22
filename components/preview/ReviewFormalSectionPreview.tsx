"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmAttendanceSectionPreview } from "@/components/preview/ConfirmAttendanceSectionPreview";
import { StarRating } from "@/components/colleges/StarRating";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewRatings,
} from "@/lib/data/collegeReviews";
import { IMAGE_FILE_ACCEPT, validateImageFile } from "@/lib/upload/imageFile";

const MAX_REVIEW_IMAGES = 3;

const EMPTY_RATINGS: CollegeReviewRatings = {
  food: 0,
  atmosphere: 0,
  value: 0,
  overall: 0,
};

type PreviewImage = {
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

/** UI-only review flow for attended-formal preview — no Convex. */
export function ReviewFormalSectionPreview({ college }: { college: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [declinedMessage, setDeclinedMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<CollegeReviewRatings>(EMPTY_RATINGS);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const ratingsComplete = useMemo(
    () => COLLEGE_REVIEW_CATEGORIES.every((c) => draft[c.key] >= 1),
    [draft],
  );

  const canAddImages = images.length < MAX_REVIEW_IMAGES;

  function handleImageSelect(file: File) {
    if (images.length >= MAX_REVIEW_IMAGES) {
      setImageError(`You can attach at most ${MAX_REVIEW_IMAGES} images.`);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setImageError(validationError);
      return;
    }
    setImageError(null);
    setImages((prev) => [
      ...prev,
      { previewUrl: URL.createObjectURL(file), fileName: file.name },
    ]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function openSubmitConfirm() {
    if (!ratingsComplete) return;
    setConfirmSubmitOpen(true);
  }

  function finishPreviewSubmit(anonymous: boolean) {
    setConfirmSubmitOpen(false);
    setSuccess(
      anonymous
        ? `Preview only — your ${college} review was not saved (anonymous).`
        : `Preview only — your ${college} review was not saved.`,
    );
  }

  const imageUploadField = (
    <div className="flex flex-col gap-2">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((img, index) => (
            <div key={img.previewUrl} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={img.fileName ?? `Photo ${index + 1}`}
                className="h-20 w-20 rounded-lg border-[2px] border-[var(--ink)] object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-xs leading-none"
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
          disabled={!canAddImages}
          className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add photo
        </button>
        <span className="text-xs text-[var(--ink-soft)]">
          {images.length}/{MAX_REVIEW_IMAGES}
        </span>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelect(file);
        }}
      />
      {imageError ? <p className="text-sm text-red-600">{imageError}</p> : null}
    </div>
  );

  if (declinedMessage) {
    return (
      <SketchCard className="p-5">
        <p className="font-display text-lg uppercase tracking-wide text-[var(--ink)]">
          Done
        </p>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{declinedMessage}</p>
      </SketchCard>
    );
  }

  if (!confirmed) {
    return (
      <ConfirmAttendanceSectionPreview
        college={college}
        onConfirm={() => setConfirmed(true)}
        onDecline={({ removeFromHistory }) =>
          setDeclinedMessage(
            removeFromHistory
              ? "Preview only — formal removed from your attended list."
              : "Preview only — marked as did not attend. No review prompt.",
          )
        }
      />
    );
  }

  return (
    <SketchCard className="p-5">
      <p className="mb-3 text-xs text-[var(--ink-soft)]">
        Preview — submit does not save to the database.
      </p>
      <h3 className="font-display text-lg uppercase tracking-wide">Rate this formal</h3>

      {success ? (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">{success}</p>
      ) : (
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
              disabled={!ratingsComplete}
              onClick={openSubmitConfirm}
              className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit review
            </button>
          </div>
        </div>
      )}

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
            onClick={() => finishPreviewSubmit(true)}
            className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Yes, post anonymously
          </button>
          <button
            type="button"
            onClick={() => finishPreviewSubmit(false)}
            className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            No, show my name
          </button>
        </div>
      </Modal>
    </SketchCard>
  );
}
