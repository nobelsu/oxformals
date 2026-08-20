"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  BrowseDateCalendar,
  BROWSE_DATE_CALENDAR_INSTRUCTIONS,
} from "./BrowseDateCalendar";
import { MY_FORMALS_SENTINEL } from "./CollegeFilter";
import { ROLE_OPTIONS } from "@/lib/data/roles";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Colleges with open listings, most first. */
  colleges: string[];
  collegeFilter: string | null;
  onCollegeChange: (value: string | null) => void;
  /** Show the "My favourites" (wishlist) option in the College list. */
  showFavourites: boolean;
  roleFilter: string | null;
  onRoleChange: (value: string | null) => void;
  pickedCalendarDates: string[];
  onDatesChange: (value: string[]) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
};

const SECTION_HEADING =
  "font-display text-sm uppercase tracking-wide text-[var(--ink)]";

const CHIP_BASE =
  "cursor-pointer rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30";
const CHIP_IDLE = `${CHIP_BASE} border-[var(--ink)]/30 bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--ink)]/50`;
const CHIP_ON = `${CHIP_BASE} border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]`;

const OPTION_ROW =
  "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--ink)]/8 focus:outline-none focus-visible:bg-[var(--ink)]/8";

export function BrowseFiltersModal({
  open,
  onClose,
  colleges,
  collegeFilter,
  onCollegeChange,
  showFavourites,
  roleFilter,
  onRoleChange,
  pickedCalendarDates,
  onDatesChange,
  onClearAll,
  hasActiveFilters,
}: Props) {
  const [collegeSearch, setCollegeSearch] = useState("");
  const filteredColleges = collegeSearch.trim()
    ? colleges.filter((c) =>
        c.toLowerCase().includes(collegeSearch.trim().toLowerCase()),
      )
    : colleges;

  function optionClass(active: boolean) {
    return `${OPTION_ROW} ${
      active ? "font-semibold text-[var(--accent)]" : ""
    }`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      compact
      panelClassName="max-w-lg"
      bodyScrollable={false}
    >
      <div className="flex flex-col gap-5">
        {/* College */}
        <div className="flex flex-col gap-2">
          <h3 className={SECTION_HEADING}>College</h3>
          <input
            type="text"
            value={collegeSearch}
            onChange={(e) => setCollegeSearch(e.target.value)}
            placeholder="Find a college..."
            aria-label="Find a college"
            autoComplete="off"
            className="w-full rounded-lg border-2 border-[var(--ink)]/20 bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)] focus:outline-none"
          />
          <div className="max-h-52 overflow-y-auto overscroll-contain rounded-lg border border-[var(--ink)]/10">
            <button
              type="button"
              onClick={() => onCollegeChange(null)}
              className={optionClass(collegeFilter === null)}
            >
              All colleges
            </button>
            {showFavourites ? (
              <button
                type="button"
                onClick={() => onCollegeChange(MY_FORMALS_SENTINEL)}
                className={optionClass(collegeFilter === MY_FORMALS_SENTINEL)}
              >
                My favourites
              </button>
            ) : null}
            {filteredColleges.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onCollegeChange(name)}
                className={optionClass(collegeFilter === name)}
              >
                {name}
              </button>
            ))}
            {filteredColleges.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--ink-soft)]">
                No colleges match.
              </p>
            ) : null}
          </div>
        </div>

        {/* When */}
        <div className="flex flex-col gap-2 border-t border-[var(--ink)]/15 pt-4">
          <h3 className={SECTION_HEADING}>When</h3>
          <p className="text-left text-[0.7rem] leading-snug text-[var(--ink-muted)] sm:text-xs">
            {BROWSE_DATE_CALENDAR_INSTRUCTIONS}
          </p>
          <BrowseDateCalendar
            embedded
            value={pickedCalendarDates}
            onChange={onDatesChange}
          />
        </div>

        {/* Role */}
        <div
          className="flex flex-col gap-2 border-t border-[var(--ink)]/15 pt-4"
          role="group"
          aria-label="Role"
        >
          <h3 className={SECTION_HEADING}>Role</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={roleFilter === null}
              onClick={() => onRoleChange(null)}
              className={roleFilter === null ? CHIP_ON : CHIP_IDLE}
            >
              All roles
            </button>
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                aria-pressed={roleFilter === role}
                onClick={() => onRoleChange(role)}
                className={roleFilter === role ? CHIP_ON : CHIP_IDLE}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--ink)]/15 pt-4">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearAll}
              className="w-full cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] px-6 py-2.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
