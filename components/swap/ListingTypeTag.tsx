"use client";

import { Chip } from "@/components/ui/Chip";
import { DualTypeBadge } from "@/components/swap/DualTypeBadge";
import type { ListingType } from "@/lib/data/types";
import { LISTING_TYPE_TAG_CLASS } from "@/lib/swap/typeTagStyles";

const LABELS: Record<Exclude<ListingType, "both">, string> = {
  swap: "Swap",
  pay: "Pay",
};

type Props = {
  listingType: ListingType;
  className?: string;
};

export function ListingTypeTag({ listingType, className }: Props) {
  if (listingType === "both") {
    return <DualTypeBadge className={className} />;
  }

  return (
    <Chip
      size="sm"
      as="span"
      appearance="plain"
      className={`${LISTING_TYPE_TAG_CLASS[listingType]} ${className ?? ""}`.trim()}
    >
      {LABELS[listingType]}
    </Chip>
  );
}
