"use client";

import { formatUnreadCount } from "@/lib/chat/unread";
import {
  LISTINGS_SECTIONS,
  LISTINGS_SECTION_LABELS,
  type ListingsSection,
} from "./types";

type NavCounts = {
  myListings: number;
  pay: number;
  attended: number;
  overviewAttention: number;
};

type Props = {
  section: ListingsSection;
  onSectionChange: (section: ListingsSection) => void;
  counts: NavCounts;
};

function sectionBadge(
  id: ListingsSection,
  counts: NavCounts,
): number | null {
  if (id === "overview" && counts.overviewAttention > 0) {
    return counts.overviewAttention;
  }
  if (id === "listings" && counts.myListings > 0) return counts.myListings;
  if (id === "pay" && counts.pay > 0) return counts.pay;
  if (id === "attended" && counts.attended > 0) return counts.attended;
  return null;
}

function NavButton({
  id,
  active,
  onClick,
  counts,
  className = "",
}: {
  id: ListingsSection;
  active: boolean;
  onClick: () => void;
  counts: NavCounts;
  className?: string;
}) {
  const badge = sectionBadge(id, counts);

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
        {LISTINGS_SECTION_LABELS[id]}
      </span>
      {badge !== null ? (
        <SectionUnreadBadge count={badge} active={active} />
      ) : null}
    </button>
  );
}

function SectionUnreadBadge({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border px-1 text-[0.65rem] font-semibold leading-none tabular-nums transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
        active
          ? "border-[var(--bg)] text-[var(--bg)]"
          : "border-[var(--ink)] text-[var(--ink)]"
      }`}
      aria-label={`${count} unread`}
    >
      {formatUnreadCount(count)}
    </span>
  );
}

export function ListingsHubNav({ section, onSectionChange, counts }: Props) {
  return (
    <>
      <nav
        className="hidden flex-col gap-1 md:flex md:w-44 md:shrink-0 md:border-r md:border-[var(--ink)]/15 md:pr-6"
        aria-label="Activity sections"
      >
        {LISTINGS_SECTIONS.map((id) => (
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
        aria-label="Activity sections"
      >
        {LISTINGS_SECTIONS.map((id) => {
          const active = section === id;
          const badge = sectionBadge(id, counts);
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
              <span className="inline-flex items-center gap-1.5">
                {LISTINGS_SECTION_LABELS[id]}
                {badge !== null ? (
                  <SectionUnreadBadge count={badge} active={active} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
