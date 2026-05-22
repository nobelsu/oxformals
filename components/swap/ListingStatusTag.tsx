"use client";

import { ListingTag } from "@/components/swap/ListingTag";
import { formatListingStatusLabel } from "@/lib/data/format";
import type { ListingStatus } from "@/lib/data/types";

type Props = {
  status: ListingStatus;
  seatsAvailable?: number;
  className?: string;
  size?: "sm" | "md";
};

export function ListingStatusTag({
  status,
  seatsAvailable,
  className,
  size = "sm",
}: Props) {
  return (
    <ListingTag size={size} className={className}>
      {formatListingStatusLabel(status, seatsAvailable)}
    </ListingTag>
  );
}
