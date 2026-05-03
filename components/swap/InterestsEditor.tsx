"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Chip } from "@/components/ui/Chip";
import { SketchCard } from "@/components/ui/SketchCard";

function parse(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function InterestsEditor() {
  const { user, updateProfile } = useAuth();
  const [draft, setDraft] = useState(user?.interests.join(", ") ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(user?.interests.join(", ") ?? "");
  }, [user]);

  if (!user) return null;

  function save() {
    const next = parse(draft);
    updateProfile({ interests: next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  const previewChips = parse(draft);

  return (
    <SketchCard seed={5} className="p-6">
      <h3 className="font-display text-3xl uppercase tracking-wide">
        Your interests
      </h3>
      <p className="mt-1 text-[var(--ink-muted)]">
        These show up on your listings so people know what you&apos;re into.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="rowing, punting, drawing"
          className="flex-1 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2 text-sm transition-colors"
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {previewChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {previewChips.map((t) => (
            <Chip key={t} size="sm" as="span">
              {t}
            </Chip>
          ))}
        </div>
      )}
    </SketchCard>
  );
}
