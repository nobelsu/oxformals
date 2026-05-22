"use client";

import { ListingTag } from "@/components/swap/ListingTag";

type Props = {
  isPast: boolean;
  /** Omit for attended formals — past date already implies completion. */
  showCompleted?: boolean;
};

export function ListingFormalBadges({
  isPast,
  showCompleted = true,
}: Props) {
  if (!isPast || !showCompleted) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ListingTag>Completed</ListingTag>
    </div>
  );
}
