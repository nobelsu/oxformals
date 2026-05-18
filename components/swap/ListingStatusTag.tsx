"use client";

import { formatListingStatusLabel } from "@/lib/data/format";
import type { ListingStatus } from "@/lib/data/types";

type Props = {
  status: ListingStatus;
  seatsAvailable?: number;
  className?: string;
  compact?: boolean;
};

export function ListingStatusTag({
  status,
  seatsAvailable,
  className,
  compact = false,
}: Props) {
  return (
    <span
      className={`rounded-full border-[2px] border-[var(--ink)] ${
        compact ? "px-2 py-0 text-[0.65rem]" : "px-3 py-0.5 text-xs"
      } ${className ?? ""}`.trim()}
    >
      {formatListingStatusLabel(status, seatsAvailable)}
    </span>
  );
}
