"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { ListingRow } from "@/components/swap/ListingRow";
import {
  formatListingTime,
  formatRelativeTime,
  formatShortDate,
} from "@/lib/data/format";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import type { FeedItem } from "@/lib/data/feed";
import { FeedComments } from "./FeedComments";
import { FeedImageLightbox } from "./FeedImageLightbox";

type Props = {
  item: FeedItem;
  onOpenListing: (listing: Listing, owner: User) => void;
};

const VERB: Record<FeedItem["kind"], string> = {
  review: "reviewed",
  listing: "listed a formal at",
  attended: "went to",
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.35rem] w-[1.35rem]"
      aria-hidden
    >
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.35rem] w-[1.35rem]"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.35rem] w-[1.35rem]"
      aria-hidden
    >
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.35rem] w-[1.35rem]"
      aria-hidden
    >
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

/** "Alice", "Alice & Bob", "Alice, Bob & 3 others" */
function attendeeNames(actors: User[], count: number): string {
  const names = actors.map((a) => a.name.split(" ")[0] || a.name);
  if (count <= 1) return names[0] ?? "Someone";
  if (count === 2) return `${names[0]} & ${names[1]}`;
  const others = count - 2;
  return `${names[0]}, ${names[1]} & ${others} other${others === 1 ? "" : "s"}`;
}

/**
 * One card in the campus feed, styled after Beli: a large avatar + bold
 * name/action/place header (with a score circle for reviews), a media-forward
 * body, a like + comment action row, and the timestamp at the foot. Flat and
 * divider-separated rather than a bordered card.
 */
export function FeedRow({ item, onOpenListing }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const toggleLike = useMutation(api.feedLikes.toggleLike);
  const toggleBookmark = useMutation(api.feedBookmarks.toggleBookmark);
  const toggleWishlist = useMutation(api.users.toggleWishlistCollege);
  const [liked, setLiked] = useState(item.viewerLiked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [bookmarked, setBookmarked] = useState(item.viewerBookmarked);
  const [favourited, setFavourited] = useState(item.onWishlist);

  // Re-sync once the reactive query catches up with each optimistic toggle.
  useEffect(() => {
    setLiked(item.viewerLiked);
    setLikeCount(item.likeCount);
    setBookmarked(item.viewerBookmarked);
    setFavourited(item.onWishlist);
  }, [item.viewerLiked, item.likeCount, item.viewerBookmarked, item.onWishlist]);

  const college = item.kind === "listing" ? item.listing.college : item.college;

  const onLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    void toggleLike({ targetKey: item.key });
  };

  const onBookmark = () => {
    setBookmarked((b) => !b);
    void toggleBookmark({ targetKey: item.key });
  };

  const onFavourite = () => {
    setFavourited((f) => !f);
    void toggleWishlist({ college });
  };

  return (
    <li className="border-t border-[var(--ink)]/10 py-5 first:border-t-0 first:pt-1">
      {/* Header */}
      <div className="flex items-start gap-3">
        {item.kind === "attended" ? (
          <span className="flex shrink-0 -space-x-2.5">
            {item.actors.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={`/profile/${a.id}`}
                className="rounded-full ring-2 ring-[var(--bg)]"
              >
                <Avatar name={a.name} size="md" source={a.avatar} />
              </Link>
            ))}
          </span>
        ) : (
          <Link href={`/profile/${item.actor.id}`} className="shrink-0">
            <Avatar name={item.actor.name} size="md" source={item.actor.avatar} />
          </Link>
        )}

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[1.05rem] leading-snug">
            {item.kind === "attended" ? (
              <span className="font-semibold">
                {attendeeNames(item.actors, item.attendeeCount)}
              </span>
            ) : (
              <Link
                href={`/profile/${item.actor.id}`}
                className="font-semibold hover:underline"
              >
                {item.actor.name.split(" ")[0] || item.actor.name}
              </Link>
            )}{" "}
            <span className="text-[var(--ink-muted)]">
              {item.kind === "attended" ? "went to" : VERB[item.kind]}
            </span>{" "}
            <Link
              href={`/college/${collegeToSlug(college)}`}
              className="font-semibold hover:underline"
            >
              {college}
            </Link>
          </p>
          {item.kind === "attended" ? (
            <p className="mt-0.5 text-[0.85rem] text-[var(--ink-muted)]">
              {formatShortDate(item.dateTime)} · {formatListingTime(item.dateTime)}
              {item.attendeeCount > 1 ? ` · ${item.attendeeCount} went` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {/* Body */}
      {item.kind === "listing" ? (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
          <ListingRow
            listing={item.listing}
            owner={item.actor}
            card
            hideInterests
            onPress={() => onOpenListing(item.listing, item.actor)}
          />
        </div>
      ) : item.kind === "review" ? (
        <div className="mt-2.5">
          {item.comment ? (
            <p className="break-words text-pretty text-[0.98rem] leading-relaxed text-[var(--ink)]">
              {item.comment}
            </p>
          ) : null}
          {item.imageUrls.length > 0 ? (
            <div
              className={`mt-3 grid gap-2 ${
                item.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {item.imageUrls.slice(0, 2).map((url, i) => {
                const extra = i === 1 && item.imageUrls.length > 2;
                return (
                  <button
                    type="button"
                    key={url}
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`View photo ${i + 1}`}
                    className="relative block cursor-pointer overflow-hidden rounded-[16px] border-[1.5px] border-[var(--ink)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className={`w-full object-cover transition-transform duration-200 hover:scale-[1.03] ${
                        item.imageUrls.length === 1 ? "max-h-80" : "h-48 sm:h-56"
                      }`}
                    />
                    {extra ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 font-display text-2xl text-white">
                        +{item.imageUrls.length - 2}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          {lightboxIndex !== null ? (
            <FeedImageLightbox
              urls={item.imageUrls}
              index={lightboxIndex}
              onIndexChange={setLightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          ) : null}
        </div>
      ) : null}

      {/* Reactions — space it clear of the card body above */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            className={`inline-flex items-center gap-1.5 transition-colors ${
              liked
                ? "text-[var(--accent)]"
                : "text-[var(--ink)] hover:text-[var(--accent)]"
            }`}
          >
            <HeartIcon filled={liked} />
            {likeCount > 0 ? (
              <span className="text-[0.85rem]">{likeCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-expanded={showComments}
            aria-label="Comments"
            className="inline-flex items-center gap-1.5 text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
          >
            <CommentIcon />
            {item.commentCount > 0 ? (
              <span className="text-[0.85rem]">{item.commentCount}</span>
            ) : null}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onFavourite}
            aria-pressed={favourited}
            aria-label={
              favourited
                ? `Remove ${college} from favourites`
                : `Add ${college} to favourites`
            }
            title={favourited ? "In your favourites" : "Favourite this college"}
            className={`transition-colors ${
              favourited
                ? "text-[var(--accent)]"
                : "text-[var(--ink)] hover:text-[var(--accent)]"
            }`}
          >
            <StarIcon filled={favourited} />
          </button>
          <button
            type="button"
            onClick={onBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            title={bookmarked ? "Saved" : "Save this post"}
            className={`transition-colors ${
              bookmarked
                ? "text-[var(--accent)]"
                : "text-[var(--ink)] hover:text-[var(--accent)]"
            }`}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>
        </div>
      </div>

      {/* Inline comment preview (collapsed state) */}
      {!showComments && item.commentPreview.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1">
          {item.commentCount > item.commentPreview.length ? (
            <button
              type="button"
              onClick={() => setShowComments(true)}
              className="self-start text-[0.82rem] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
            >
              View all {item.commentCount} comments
            </button>
          ) : null}
          {item.commentPreview.map((c, i) => (
            <p key={i} className="break-words text-pretty text-[0.9rem] leading-snug">
              <span className="font-semibold">{c.name.split(" ")[0] || c.name}</span>{" "}
              <span className="text-[var(--ink-muted)]">{c.text}</span>
            </p>
          ))}
        </div>
      ) : null}

      {showComments ? <FeedComments targetKey={item.key} /> : null}

      {/* Timestamp — attendances state the formal date in the header instead. */}
      {item.kind !== "attended" ? (
        <p className="mt-2.5 text-[0.75rem] text-[var(--ink-soft)]">
          {formatRelativeTime(item.ts)}
        </p>
      ) : null}
    </li>
  );
}
