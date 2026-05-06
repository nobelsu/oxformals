"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { OXFORD_COLLEGES } from "@/lib/data/colleges";

type Props = {
  selected: string[];
  onToggle: (college: string) => void;
};

function renderHighlightedMatch(label: string, query: string) {
  const q = query.trim();
  if (!q) return label;
  const lowerLabel = label.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const start = lowerLabel.indexOf(lowerQuery);
  if (start < 0) return label;
  const end = start + q.length;
  return (
    <>
      {label.slice(0, start)}
      <mark className="rounded bg-[var(--accent)]/25 px-0.5 text-current">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}

export function WishlistChips({ selected, onToggle }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredColleges = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return OXFORD_COLLEGES;
    return OXFORD_COLLEGES.filter((college) =>
      college.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-3xl uppercase tracking-wide">
            Formals I want to try
          </h3>
          <p className="mt-1 text-base text-[var(--ink-muted)]">
            Tap a college to add it to your wishlist.
          </p>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search colleges"
          className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none sm:mt-1 sm:w-64"
          aria-label="Search colleges"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filteredColleges.map((c) => (
          <Chip
            key={c}
            size="sm"
            className="!text-base py-1 leading-snug"
            variant={selected.includes(c) ? "filled" : "outline"}
            onClick={() => onToggle(c)}
          >
            {renderHighlightedMatch(c, searchQuery)}
          </Chip>
        ))}
      </div>
    </section>
  );
}
