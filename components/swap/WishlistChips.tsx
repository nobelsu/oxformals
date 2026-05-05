"use client";

import { Chip } from "@/components/ui/Chip";
import { OXFORD_COLLEGES } from "@/lib/data/colleges";

type Props = {
  selected: string[];
  onToggle: (college: string) => void;
};

export function WishlistChips({ selected, onToggle }: Props) {
  return (
    <section>
      <h3 className="font-display text-3xl uppercase tracking-wide">
        Formals I want to try
      </h3>
      <p className="mt-1 text-base text-[var(--ink-muted)]">
        Tap a college to add it to your wishlist.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OXFORD_COLLEGES.map((c) => (
          <Chip
            key={c}
            size="sm"
            className="!text-base py-1 leading-snug"
            variant={selected.includes(c) ? "filled" : "outline"}
            onClick={() => onToggle(c)}
          >
            {c}
          </Chip>
        ))}
      </div>
    </section>
  );
}
