"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatListingDate } from "@/lib/data/format";
import type { CollegeReviewPublic } from "@/lib/data/collegeReviews";

type Props = {
  college: string;
};

type ReviewPhoto = {
  url: string;
  reviewId: string;
  formalDateTime: string;
  caption: string;
};

function photosFromReviews(reviews: CollegeReviewPublic[]): ReviewPhoto[] {
  const photos: ReviewPhoto[] = [];
  for (const review of reviews) {
    const urls = review.imageUrls ?? [];
    if (urls.length === 0) continue;

    const dateLabel = review.formalDateTime
      ? formatListingDate(review.formalDateTime)
      : "";
    const authorLabel = review.isAnonymous
      ? "Anonymous"
      : review.author?.name ?? "Oxford student";
    const caption = [authorLabel, dateLabel].filter(Boolean).join(" · ");

    for (const url of urls) {
      photos.push({
        url,
        reviewId: review.id,
        formalDateTime: review.formalDateTime,
        caption,
      });
    }
  }
  return photos;
}

export function countReviewPhotos(reviews: CollegeReviewPublic[] | undefined): number | null {
  if (reviews === undefined) return null;
  return reviews.reduce((n, r) => n + (r.imageUrls?.length ?? 0), 0);
}

export function CollegePhotosSection({ college }: Props) {
  const reviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college,
    sort: "recent",
    limit: 100,
  });

  const photos = useMemo(
    () => (reviews === undefined ? undefined : photosFromReviews(reviews)),
    [reviews],
  );

  if (photos === undefined) {
    return <p className="text-[var(--ink-muted)]">Loading photos…</p>;
  }

  if (photos.length === 0) {
    return (
      <p className="text-[var(--ink-muted)]">
        No photos yet. They appear here when guests add images to their reviews.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, index) => (
        <figure
          key={`${photo.reviewId}-${photo.url}-${index}`}
          className="group relative overflow-hidden rounded-[12px] border-[2px] border-[var(--ink)] bg-[var(--paper)]"
        >
          <a
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Review photo ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </a>
          {photo.caption ? (
            <figcaption className="border-t-[2px] border-[var(--ink)]/15 px-2 py-1.5 text-[0.7rem] leading-snug text-[var(--ink-muted)]">
              {photo.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
