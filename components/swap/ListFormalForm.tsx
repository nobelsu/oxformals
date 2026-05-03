"use client";

import { useState, type FormEvent } from "react";
import { Chip } from "@/components/ui/Chip";
import { SketchCard } from "@/components/ui/SketchCard";
import { OXFORD_COLLEGES } from "@/lib/data/colleges";
import type { CreateListingInput } from "@/lib/data/dataClient";

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Postgrad"];
const SEATS: Array<1 | 2 | 3> = [1, 2, 3];
const SWAP_FOR_OPTIONS = [
  "Merton",
  "Christ Church",
  "Magdalen",
  "Trinity",
  "Wadham",
  "New College",
  "Exeter",
  "Keble",
  "Oriel",
  "Worcester",
  "Pembroke",
  "Hertford",
  "St John's",
  "Brasenose",
  "Lincoln",
  "St Anne's",
];

type Props = {
  defaultCollege?: string;
  defaultYear?: string;
  onSubmit: (input: CreateListingInput) => void;
};

export function ListFormalForm({
  defaultCollege = "",
  defaultYear = "",
  onSubmit,
}: Props) {
  const [college, setCollege] = useState(defaultCollege);
  const [dateTime, setDateTime] = useState("");
  const [seats, setSeats] = useState<1 | 2 | 3>(2);
  const [year, setYear] = useState(defaultYear || YEARS[1]);
  const [swapFor, setSwapFor] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleSwap(c: string) {
    setSwapFor((curr) =>
      curr.includes(c) ? curr.filter((x) => x !== c) : [...curr, c],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!college || !dateTime) {
      setError("Add a college and a date & time.");
      return;
    }
    const iso = new Date(dateTime).toISOString();
    onSubmit({
      college,
      dateTime: iso,
      seats,
      year,
      swapFor,
      message: message.trim(),
    });
    setDateTime("");
    setSwapFor([]);
    setMessage("");
  }

  const fieldCls =
    "w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none";

  return (
    <SketchCard seed={4} className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <h3 className="font-display text-3xl uppercase tracking-wide">
          + List a formal
        </h3>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">
            College formal
          </span>
          <select
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className={fieldCls}
          >
            <option value="">Choose college</option>
            {OXFORD_COLLEGES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

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

        <div className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Your year</span>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((y) => (
              <Chip
                key={y}
                variant={year === y ? "filled" : "outline"}
                onClick={() => setYear(y)}
              >
                {y}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Will swap for</span>
          <div className="flex flex-wrap gap-2">
            {SWAP_FOR_OPTIONS.map((c) => (
              <Chip
                key={c}
                size="sm"
                variant={swapFor.includes(c) ? "filled" : "outline"}
                onClick={() => toggleSwap(c)}
              >
                {c}
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
      </form>
    </SketchCard>
  );
}
