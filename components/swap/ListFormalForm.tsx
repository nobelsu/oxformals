"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Chip } from "@/components/ui/Chip";
import { SketchCard } from "@/components/ui/SketchCard";
import { normalizeCollegeName } from "@/lib/data/colleges";
import type { NewListingInput } from "@/lib/data/dataClient";

const SEATS: Array<1 | 2 | 3> = [1, 2, 3];

export type ListingProfileFields = {
  college: string;
  year: string;
  role: string;
};

type Props = {
  /** Current profile values used to validate before post (same source as createListing). */
  profile: ListingProfileFields;
  /** When true, render only the form (no outer SketchCard) for use inside a modal. */
  embedded?: boolean;
  onSubmit: (input: NewListingInput) => void;
};

export function ListFormalForm({
  profile,
  embedded = false,
  onSubmit,
}: Props) {
  const resolvedCollege = useMemo(
    () => normalizeCollegeName(profile.college),
    [profile.college],
  );

  const [dateTime, setDateTime] = useState("");
  const [seats, setSeats] = useState<1 | 2 | 3>(2);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const year = profile.year.trim();
    const role = profile.role.trim();
    if (!resolvedCollege || !year || !role) {
      setError(
        "Set college, year, and role in My profile (Mine tab), save, then try again.",
      );
      return;
    }
    if (!dateTime) {
      setError("Add a date & time.");
      return;
    }
    const iso = new Date(dateTime).toISOString();
    onSubmit({
      dateTime: iso,
      seats,
      message: message.trim(),
    });
    setDateTime("");
    setMessage("");
  }

  const fieldCls =
    "w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none";

  const formInner = (
    <>
        <h3 className="font-display text-3xl uppercase tracking-wide">
          + List a formal
        </h3>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Date &amp; time</span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className={fieldCls}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Seats available</span>
          <div className="flex gap-2">
            {SEATS.map((s) => (
              <Chip
                key={s}
                variant={seats === s ? "filled" : "outline"}
                onClick={() => setSeats(s)}
              >
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">
            Short message (optional)
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Anything to mention?"
            className="w-full rounded-[20px] border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
          />
        </label>

        {error && (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        )}

        <button
          type="submit"
          className="self-start rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2 text-base transition-colors"
        >
          Post listing
        </button>
    </>
  );

  if (embedded) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {formInner}
      </form>
    );
  }

  return (
    <SketchCard seed={4} className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {formInner}
      </form>
    </SketchCard>
  );
}
