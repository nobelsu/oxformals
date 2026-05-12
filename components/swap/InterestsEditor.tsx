"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Chip } from "@/components/ui/Chip";
import { SketchCard } from "@/components/ui/SketchCard";

const MAX_INTEREST_LENGTH = 40;
const MAX_INTERESTS = 20;

function normalize(raw: string): string {
  return raw.trim().slice(0, MAX_INTEREST_LENGTH);
}

export function InterestsEditor() {
  const { user, updateProfile } = useAuth();
  const [tags, setTags] = useState<string[]>(user?.interests ?? []);
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTags(user?.interests ?? []);
  }, [user]);

  if (!user) return null;

  function persist(next: string[]) {
    setTags(next);
    updateProfile({ interests: next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function addTag() {
    const value = normalize(input);
    if (!value) return;
    if (tags.length >= MAX_INTERESTS) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setInput("");
      return;
    }
    persist([...tags, value]);
    setInput("");
    inputRef.current?.focus();
  }

  function removeTag(index: number) {
    persist(tags.filter((_, i) => i !== index));
  }

  const canAdd = normalize(input).length > 0 && tags.length < MAX_INTERESTS;

  return (
    <SketchCard seed={5} className="p-6">
      <h3 className="font-display text-3xl uppercase tracking-wide">
        Your interests
      </h3>
      <p className="mt-1 text-[var(--ink-muted)]">
        These show up on your listings so people know what you&apos;re into.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          enterKeyHint="done"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add an interest…"
          className="min-w-0 flex-1 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!canAdd}
          aria-label="Add interest"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-30 disabled:pointer-events-none"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <Chip key={`${t}-${i}`} size="sm" as="button" onClick={() => removeTag(i)}>
              {t}
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="ml-1 h-3 w-3 shrink-0 opacity-60"
                aria-hidden="true"
              >
                <path d="M4.47 4.47a.75.75 0 0 1 1.06 0L8 6.94l2.47-2.47a.75.75 0 1 1 1.06 1.06L9.06 8l2.47 2.47a.75.75 0 1 1-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 0 1-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </Chip>
          ))}
        </div>
      )}

      {saved && (
        <p className="mt-2 text-xs text-[var(--ink-muted)]">Saved ✓</p>
      )}
    </SketchCard>
  );
}
