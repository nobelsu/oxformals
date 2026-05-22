"use client";

import {
  COLLEGE_PAGE_SECTIONS,
  COLLEGE_PAGE_SECTION_LABELS,
  type CollegePageSection,
} from "./collegePageTypes";

type NavCounts = {
  photos: number | null;
  listings: number | null;
};

type Props = {
  section: CollegePageSection;
  onSectionChange: (section: CollegePageSection) => void;
  counts: NavCounts;
};

function sectionCount(id: CollegePageSection, counts: NavCounts): number | null {
  if (id === "photos") return counts.photos;
  if (id === "listings") return counts.listings;
  return null;
}

function NavButton({
  id,
  active,
  onClick,
  counts,
  className = "",
}: {
  id: CollegePageSection;
  active: boolean;
  onClick: () => void;
  counts: NavCounts;
  className?: string;
}) {
  const count = sectionCount(id, counts);
  const showCount = count !== null && count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex w-full cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-left text-sm transition-all duration-200 ease-out motion-reduce:transition-none ${className} ${
        active
          ? "bg-[var(--ink)] text-[var(--bg)]"
          : "border-2 border-transparent text-[var(--ink)] hover:border-[var(--ink)]/25 hover:bg-[var(--paper)] hover:translate-x-1 motion-reduce:hover:translate-x-0 active:scale-[0.98]"
      }`}
    >
      <span className="font-display uppercase tracking-wide transition-transform duration-200 ease-out group-hover:tracking-wider motion-reduce:group-hover:tracking-wide">
        {COLLEGE_PAGE_SECTION_LABELS[id]}
        {showCount ? (
          <span className="ml-1.5 opacity-80">({count})</span>
        ) : null}
      </span>
    </button>
  );
}

export function CollegePageNav({
  section,
  onSectionChange,
  counts,
}: Props) {
  return (
    <>
      <nav
        className="hidden flex-col gap-1 md:flex md:w-44 md:shrink-0 md:border-r md:border-[var(--ink)]/15 md:pr-6"
        aria-label="College sections"
      >
        {COLLEGE_PAGE_SECTIONS.map((id) => (
          <NavButton
            key={id}
            id={id}
            active={section === id}
            onClick={() => onSectionChange(id)}
            counts={counts}
          />
        ))}
      </nav>

      <div
        className="flex gap-2 overflow-x-auto pb-1 md:hidden"
        role="tablist"
        aria-label="College sections"
      >
        {COLLEGE_PAGE_SECTIONS.map((id) => {
          const active = section === id;
          const count = sectionCount(id, counts);
          const showCount = count !== null && count > 0;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSectionChange(id)}
              className={`shrink-0 cursor-pointer rounded-full border-[2px] px-4 py-1.5 text-sm whitespace-nowrap transition-all duration-200 ease-out motion-reduce:transition-none ${
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                  : "border-[var(--ink)] text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--paper)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 active:scale-[0.98]"
              }`}
            >
              <span className="font-display uppercase tracking-wide">
                {COLLEGE_PAGE_SECTION_LABELS[id]}
                {showCount ? (
                  <span className="ml-1.5 opacity-80">({count})</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
