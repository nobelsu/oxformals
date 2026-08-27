"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { collegeToSlug } from "@/lib/data/collegeSlug";

type GalleryEntry = {
  college: string;
  photoCount: number;
  reviewCount: number;
};

function photoCountLabel(count: number): string {
  if (count === 0) return "No photos yet";
  return `${count} ${count === 1 ? "photo" : "photos"}`;
}

function CollegeRow({ entry }: { entry: GalleryEntry }) {
  return (
    <li className="border-t border-[var(--ink)]/10 first:border-t-0">
      <Link
        href={`/college/${collegeToSlug(entry.college)}`}
        className="group flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-[var(--ink)]/5 focus-visible:bg-[var(--ink)]/5"
      >
        <span className="min-w-0 flex-1 truncate font-display text-lg uppercase tracking-wide group-hover:underline">
          {entry.college}
        </span>
        <span className="shrink-0 text-sm text-[var(--ink-muted)]">
          {photoCountLabel(entry.photoCount)}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-[var(--ink-soft)] transition-transform group-hover:translate-x-0.5"
        >
          ›
        </span>
      </Link>
    </li>
  );
}

export function CollegesTab() {
  const entries = useQuery(api.collegeReviews.getCollegeGallery, {});
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!entries) return entries;
    if (!trimmed) return entries;
    return entries.filter((entry) =>
      entry.college.toLowerCase().includes(trimmed),
    );
  }, [entries, trimmed]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide">
          Colleges
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Every Oxford college — step inside formal hall through photos from
          guests&rsquo; reviews.
        </p>
      </div>

      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
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

      {filtered === undefined ? (
        <p className="text-[var(--ink-muted)]">Loading colleges…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          No colleges match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)]">
          {filtered.map((entry) => (
            <CollegeRow key={entry.college} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
