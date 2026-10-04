"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { CloseIcon } from "@/components/ui/icons";
import { SkeletonRows } from "@/components/ui/Loading";
import type { AvatarSource } from "@/lib/auth/types";

/** "Find people": type a name, tap a result to open their profile. */
export function PeopleSearch({ className = "" }: { className?: string }) {
  const inputId = useId();
  const [text, setText] = useState("");
  // Results follow the typing without firing a query on every keystroke.
  const query = useDeferredValue(text.trim());
  const active = query.length >= 2;
  const people = useQuery(api.peopleSearch.searchPeople, active ? { query } : "skip");

  return (
    <section
      aria-label="Find people"
      className={`rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.35)] ${className}`}
    >
      <label htmlFor={inputId} className="text-sm font-bold text-[var(--ink)]">
        Find people
      </label>
      <div className="relative mt-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          id={inputId}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by name"
          autoComplete="off"
          className="w-full rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--bg)] py-2 pl-10 pr-9 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setText("")}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      {active ? (
        people === undefined ? (
          <SkeletonRows count={2} className="mt-4" />
        ) : people.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">Nobody by that name.</p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/profile/${p.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                >
                  <Avatar name={p.name} size="sm" source={p.avatar as AvatarSource | undefined} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--ink)]">{p.name}</span>
                    {p.college ? (
                      <span className="block truncate text-xs text-[var(--ink-muted)]">{p.college}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
