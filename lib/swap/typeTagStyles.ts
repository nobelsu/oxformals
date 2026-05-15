import type { ListingType, RequestType } from "@/lib/data/types";

/** Filled chip colors for single-type listing / request badges. */
export const LISTING_TYPE_TAG_CLASS: Record<
  Exclude<ListingType, "both">,
  string
> = {
  swap: "bg-[var(--tag)] text-[var(--tag-ink)] border-[var(--tag)]",
  pay: "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]",
};

export const REQUEST_TYPE_TAG_CLASS: Record<RequestType, string> = {
  swap: LISTING_TYPE_TAG_CLASS.swap,
  pay: LISTING_TYPE_TAG_CLASS.pay,
};
