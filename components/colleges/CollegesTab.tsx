"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { CollegeCrest } from "@/components/colleges/CollegeCrest";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Loading";
import { collegeToSlug } from "@/lib/data/collegeSlug";

type Sort = "soon" | "wanted" | "rated";
type Entry = {
  college: string;
  wantCount: number;
  weekCount: number;
  reviewCount: number;
  rating: number | null;
  onMyWishlist: boolean;
};

const SORTS: { id: Sort; label: string }[] = [
  { id: "soon", label: "Formals soon" },
  { id: "wanted", label: "Most wanted" },
  { id: "rated", label: "Top rated" },
];

function signal(e: Entry): { text: string; hot: boolean } {
  if (e.weekCount > 0) {
    return { text: `${e.weekCount} formal${e.weekCount === 1 ? "" : "s"} this week`, hot: true };
  }
  if (e.rating !== null) return { text: `★ ${e.rating.toFixed(1)} · ${e.reviewCount} review${e.reviewCount === 1 ? "" : "s"}`, hot: false };
  if (e.wantCount > 0) return { text: `${e.wantCount} want to go`, hot: false };
  return { text: "No formals yet", hot: false };
}

function sortEntries(entries: Entry[], sort: Sort): Entry[] {
  const byName = (a: Entry, b: Entry) => a.college.localeCompare(b.college);
  const copy = [...entries];
  if (sort === "soon") copy.sort((a, b) => b.weekCount - a.weekCount || b.wantCount - a.wantCount || byName(a, b));
  if (sort === "wanted") copy.sort((a, b) => b.wantCount - a.wantCount || byName(a, b));
  if (sort === "rated") copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount || byName(a, b));
  return copy;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={filled ? "var(--accent)" : "none"} stroke={filled ? "var(--accent)" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

function CollegeTile({ entry }: { entry: Entry }) {
  const { isAuthenticated } = useAuth();
  const toggle = useMutation(api.users.toggleWishlistCollege);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const wished = optimistic ?? entry.onMyWishlist;
  const s = signal(entry);
  return (
    <li className="relative">
      <Link
        href={`/college/${collegeToSlug(entry.college)}`}
        className="flex h-full flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-3 pb-4 pt-5 text-center transition-colors hover:border-[var(--ink)]"
      >
        <CollegeCrest college={entry.college} size={54} />
        <span className="font-display text-lg uppercase leading-none tracking-wide">{entry.college}</span>
        <span className={`text-xs ${s.hot ? "font-bold text-[var(--accent)]" : "text-[var(--ink-muted)]"}`}>{s.text}</span>
      </Link>
      {isAuthenticated ? (
        <button
          type="button"
          aria-label={wished ? `Remove ${entry.college} from your wishlist` : `Add ${entry.college} to your wishlist`}
          aria-pressed={wished}
          onClick={() => {
            setOptimistic(!wished);
            void toggle({ college: entry.college }).finally(() => setOptimistic(null));
          }}
          className="absolute right-2.5 top-2.5 cursor-pointer rounded-full p-1 text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
        >
          <HeartIcon filled={wished} />
        </button>
      ) : null}
    </li>
  );
}

export function CollegesTab() {
  const entries = useQuery(api.collegeDirectory.listDirectory, {});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("soon");

  const trimmed = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!entries) return undefined;
    const matching = trimmed
      ? entries.filter((e) => e.college.toLowerCase().includes(trimmed))
      : entries;
    return sortEntries(matching, sort);
  }, [entries, trimmed, sort]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-4xl uppercase tracking-wide">Colleges</h1>

      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search colleges"
          aria-label="Search colleges"
          className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] py-2.5 pl-11 pr-4 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent-hover)] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSort(s.id)}
            aria-pressed={sort === s.id}
            className={`cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] px-3.5 py-1.5 text-sm transition-colors ${
              sort === s.id ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {shown === undefined ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-[18px]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon="search" title="No colleges match" body={`Nothing called "${query.trim()}".`} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((entry) => (
            <CollegeTile key={entry.college} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
