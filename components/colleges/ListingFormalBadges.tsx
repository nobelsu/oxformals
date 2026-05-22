"use client";

import { ListingTag } from "@/components/swap/ListingTag";

type Props = {
  isPast: boolean;
  canRate?: boolean;
};

export function ListingFormalBadges({ isPast, canRate }: Props) {
  if (!isPast) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ListingTag>Completed</ListingTag>
      {canRate ? <ListingTag variant="accent">Rate formal</ListingTag> : null}
    </div>
  );
}
