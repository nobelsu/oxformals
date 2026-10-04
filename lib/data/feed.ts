import type { User } from "@/lib/auth/types";
import type { Listing } from "./types";

/** Re-exported for client callers; source of truth lives dependency-free. */
export { MAX_FEED_COMMENT_LENGTH } from "./feedConstants";

/** Ratings block shared by review items (mirrors collegeReviews.ratings). */
export type FeedReviewRatings = {
  food: number;
  atmosphere: number;
  value: number;
  overall: number;
};

type FeedItemBase = {
  /** Stable key the item's like + comment threads hang off of. */
  key: string;
  ts: number;
  /** The item's college is on the viewer's wishlist. */
  onWishlist: boolean;
  commentCount: number;
  /** Up to 3 most-recent comments (oldest-of-the-three first) for an inline peek. */
  commentPreview: { name: string; text: string }[];
  likeCount: number;
  viewerLiked: boolean;
  viewerBookmarked: boolean;
};

export type FeedListingItem = FeedItemBase & {
  kind: "listing";
  /** The listing owner. */
  actor: User;
  listing: Listing;
};

export type FeedReviewItem = FeedItemBase & {
  kind: "review";
  /** The review author. */
  actor: User;
  college: string;
  ratings: FeedReviewRatings;
  comment: string | null;
  imageUrls: string[];
};

export type FeedAttendedItem = FeedItemBase & {
  kind: "attended";
  /** Everyone who attended this college's formal that night (bundled). */
  actors: User[];
  attendeeCount: number;
  college: string;
  dateTime: string;
};

export type FeedItem = FeedListingItem | FeedReviewItem | FeedAttendedItem;

export type FeedComment = {
  id: string;
  text: string;
  ts: number;
  author: User | null;
  isMine: boolean;
};
