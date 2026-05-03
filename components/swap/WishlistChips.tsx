"use client";

import { Chip } from "@/components/ui/Chip";

const WISHLIST_OPTIONS = [
  "Merton",
  "Christ Church",
  "Magdalen",
  "Trinity",
  "Wadham",
  "New College",
  "Exeter",
  "Keble",
  "Oriel",
  "Worcester",
  "Pembroke",
  "Hertford",
  "St John's",
  "Brasenose",
  "Lincoln",
  "St Anne's",
];

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
      <p className="mt-1 text-[var(--ink-muted)]">
        Tap a college to add it to your wishlist.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {WISHLIST_OPTIONS.map((c) => (
          <Chip
            key={c}
            size="sm"
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
