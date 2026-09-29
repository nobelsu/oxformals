"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useIsClient } from "@/lib/hooks/useIsClient";
import {
  BrowseDateCalendar,
  BROWSE_DATE_CALENDAR_INSTRUCTIONS,
} from "./BrowseDateCalendar";
import { formalTypeInfo } from "./FormalTypeTag";
import { ROLE_OPTIONS } from "@/lib/data/roles";
import {
  EMPTY_BROWSE_FILTERS,
  FORMAL_TYPES,
  guestsLabel,
  type BrowseFilters,
  type HowOption,
  type WhenPreset,
} from "@/lib/data/browseFilters";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The filters in force; the sheet edits a copy until "Show". */
  value: BrowseFilters;
  onApply: (next: BrowseFilters) => void;
  /** How many formals a set of filters would show. */
  countFor: (filters: BrowseFilters) => number;
  /** Colleges with open listings, most first. */
  colleges: string[];
  /** Offer the "Want to go" chip (signed in with a non-empty list). */
  showWantToGo: boolean;
  maxGuests: number;
};

const WHEN_LABELS: Record<WhenPreset, string> = {
  tonight: "Tonight",
  week: "This week",
  weekend: "Weekend",
  dates: "Pick dates",
};

const HOW_LABELS: Record<HowOption, string> = { swap: "Swap", pay: "Pay" };

const LINE = "border-[color-mix(in_srgb,var(--ink)_14%,transparent)]";

const CHIP_BASE =
  "cursor-pointer whitespace-nowrap rounded-full border-[1.5px] px-3 py-1.5 text-[13px] leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30";
const CHIP_IDLE = `${CHIP_BASE} ${LINE} bg-transparent text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--ink)_32%,transparent)]`;
const CHIP_ON = `${CHIP_BASE} border-[var(--ink)] bg-[var(--ink)] font-bold text-[var(--bg)]`;

function Chip({
  on,
  onClick,
  children,
  label,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={on ? CHIP_ON : CHIP_IDLE}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 pb-1 pt-3" role="group" aria-label={title}>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function toggle<T>(xs: T[], x: T): T[] {
  return xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x];
}

export function BrowseFiltersModal(props: Props) {
  const isClient = useIsClient();
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;

  // Portal to <body> so a transformed ancestor can't trap the fixed layer.
  return createPortal(<FiltersSheet {...props} />, document.body);
}

function FiltersSheet({
  onClose,
  value,
  onApply,
  countFor,
  colleges,
  showWantToGo,
  maxGuests,
}: Props) {
  const titleId = useId();
  const [draft, setDraft] = useState<BrowseFilters>(value);
  const [pickingCollege, setPickingCollege] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState("");

  const set = (patch: Partial<BrowseFilters>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const count = countFor(draft);
  const q = collegeSearch.trim().toLowerCase();
  const addableColleges = colleges.filter(
    (c) => !draft.colleges.includes(c) && (!q || c.toLowerCase().includes(q)),
  );

  function pickWhen(when: WhenPreset) {
    if (draft.when === when) set({ when: null, dates: [] });
    else set({ when, dates: when === "dates" ? draft.dates : [] });
  }

  function clear() {
    setDraft(EMPTY_BROWSE_FILTERS);
    setPickingCollege(false);
    setCollegeSearch("");
  }

  const stepBtn =
    "flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)] text-base font-bold leading-none text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] border-2 border-b-0 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-md sm:rounded-[20px] sm:border-b-2">
        <span
          aria-hidden
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--ink)_20%,transparent)] sm:hidden"
        />
        <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3 sm:pt-4">
          <h2
            id={titleId}
            className="font-display text-2xl uppercase tracking-wide"
          >
            Filters
          </h2>
          <button
            type="button"
            onClick={clear}
            className="cursor-pointer text-[13px] text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Clear
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
          <Section title="When">
            <div className="flex flex-wrap gap-[7px]">
              {(Object.keys(WHEN_LABELS) as WhenPreset[]).map((w) => (
                <Chip key={w} on={draft.when === w} onClick={() => pickWhen(w)}>
                  {WHEN_LABELS[w]}
                </Chip>
              ))}
            </div>
            {draft.when === "dates" ? (
              <div className="mt-3">
                <p className="mb-2 text-xs text-[var(--ink-muted)]">
                  {BROWSE_DATE_CALENDAR_INSTRUCTIONS}
                </p>
                <BrowseDateCalendar
                  embedded
                  value={draft.dates}
                  onChange={(dates) => set({ dates })}
                />
              </div>
            ) : null}
          </Section>

          <Section title="Where">
            <div className="flex flex-wrap gap-[7px]">
              {showWantToGo ? (
                <Chip
                  on={draft.wantToGo}
                  onClick={() => set({ wantToGo: !draft.wantToGo })}
                >
                  Want to go
                </Chip>
              ) : null}
              {draft.colleges.map((c) => (
                <Chip
                  key={c}
                  on
                  label={`Remove ${c}`}
                  onClick={() => set({ colleges: draft.colleges.filter((x) => x !== c) })}
                >
                  {c}
                  <span aria-hidden className="ml-1 opacity-60">
                    ×
                  </span>
                </Chip>
              ))}
              <Chip
                on={false}
                onClick={() => setPickingCollege((p) => !p)}
              >
                + College
              </Chip>
            </div>
            {pickingCollege ? (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={collegeSearch}
                  onChange={(e) => setCollegeSearch(e.target.value)}
                  placeholder="Find a college"
                  aria-label="Find a college"
                  autoComplete="off"
                  autoFocus
                  className={`w-full rounded-xl border-[1.5px] ${LINE} bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--ink)] focus:outline-none`}
                />
                <div className="mt-1.5 max-h-44 overflow-y-auto overscroll-contain">
                  {addableColleges.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        set({ colleges: [...draft.colleges, c] });
                        setPickingCollege(false);
                        setCollegeSearch("");
                      }}
                      className={`flex w-full cursor-pointer items-center border-t-[1.5px] ${LINE} px-1 py-2 text-left text-sm first:border-t-0 hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]`}
                    >
                      {c}
                    </button>
                  ))}
                  {addableColleges.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-[var(--ink-soft)]">
                      No colleges match.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Section>

          <Section title="How">
            <div className="flex flex-wrap gap-[7px]">
              {(Object.keys(HOW_LABELS) as HowOption[]).map((h) => (
                <Chip
                  key={h}
                  on={draft.how.includes(h)}
                  onClick={() => set({ how: toggle(draft.how, h) })}
                >
                  {HOW_LABELS[h]}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Seats">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                aria-label="Fewer"
                disabled={draft.guests <= 0}
                onClick={() => set({ guests: Math.max(0, draft.guests - 1) })}
                className={stepBtn}
              >
                &minus;
              </button>
              <b className="min-w-[4.5rem] text-center text-sm" aria-live="polite">
                {guestsLabel(draft.guests)}
              </b>
              <button
                type="button"
                aria-label="More"
                disabled={draft.guests >= maxGuests}
                onClick={() => set({ guests: Math.min(maxGuests, draft.guests + 1) })}
                className={stepBtn}
              >
                +
              </button>
            </div>
          </Section>

          <Section title="Type">
            <div className="flex flex-wrap gap-[7px]">
              {FORMAL_TYPES.map((t) => (
                <Chip
                  key={t}
                  on={draft.types.includes(t)}
                  onClick={() => set({ types: toggle(draft.types, t) })}
                >
                  {formalTypeInfo(t).label}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Role">
            <div className="flex flex-wrap gap-[7px]">
              {ROLE_OPTIONS.map((r) => (
                <Chip
                  key={r}
                  on={draft.role === r}
                  onClick={() => set({ role: draft.role === r ? null : r })}
                >
                  {r}
                </Chip>
              ))}
            </div>
          </Section>
        </div>

        <div
          className={`flex shrink-0 gap-2.5 border-t-[1.5px] ${LINE} px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5`}
        >
          <button
            type="button"
            onClick={clear}
            className="flex-1 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-transparent py-2.5 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-[2] cursor-pointer rounded-full border-2 border-[var(--accent)] bg-[var(--accent)] py-2.5 text-sm font-bold text-[var(--accent-ink)] transition-colors hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]"
          >
            Show {count} {count === 1 ? "formal" : "formals"}
          </button>
        </div>
      </div>
    </div>
  );
}
