"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { OXFORD_COLLEGES } from "@/lib/data/colleges";

type Props = {
  selected: string[];
  onSave: (colleges: string[]) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
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
      <mark className="rounded bg-[var(--accent-wash)]/25 px-0.5 text-current">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}

export function WishlistChips({
  selected,
  onSave,
  onDirtyChange,
  registerSave,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState<string[] | null>(null);
  const effectiveSelected = draftSelected ?? selected;

  const filteredColleges = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return OXFORD_COLLEGES;
    return OXFORD_COLLEGES.filter((college) =>
      college.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const hasUnsavedChanges = useMemo(() => {
    if (effectiveSelected.length !== selected.length) return true;
    const selectedSet = new Set(selected);
    return effectiveSelected.some((college) => !selectedSet.has(college));
  }, [effectiveSelected, selected]);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    registerSave?.(async () => {
      if (!hasUnsavedChanges) return;
      await onSave(effectiveSelected);
      setDraftSelected(null);
    });
  }, [registerSave, hasUnsavedChanges, onSave, effectiveSelected]);

  function toggleDraft(college: string) {
    setDraftSelected((prev) => {
      const source = prev ?? selected;
      const next = source.includes(college)
        ? source.filter((item) => item !== college)
        : [...source, college];
      if (next.length === selected.length) {
        const selectedSet = new Set(selected);
        const isSameAsOriginal = next.every((item) => selectedSet.has(item));
        if (isSameAsOriginal) return null;
      }
      return next;
    });
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-3xl uppercase tracking-wide">
            Formals I want to try
          </h3>
          <p className="mt-1 text-base text-[var(--ink-muted)]">
            Tap colleges, then save your wishlist.
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
            variant={effectiveSelected.includes(c) ? "filled" : "outline"}
            onClick={() => toggleDraft(c)}
          >
            {renderHighlightedMatch(c, searchQuery)}
          </Chip>
        ))}
      </div>
    </section>
  );
}
