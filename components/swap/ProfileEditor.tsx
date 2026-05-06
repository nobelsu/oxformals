"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar, PRESET_AVATARS } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SketchCard } from "@/components/ui/SketchCard";
import type { AvatarSource } from "@/lib/auth/types";
import { normalizeCollegeName, OXFORD_COLLEGES } from "@/lib/data/colleges";

const TARGET_SIZE = 256;
const MAX_DATA_URL_BYTES = 250 * 1024;

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

function parseInterests(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function fileToSquareDataUrl(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = objectUrl;
    });

    const minSide = Math.min(img.naturalWidth, img.naturalHeight);
    if (!minSide) return null;
    const sx = Math.max(0, (img.naturalWidth - minSide) / 2);
    const sy = Math.max(0, (img.naturalHeight - minSide) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET_SIZE, TARGET_SIZE);

    let quality = 0.85;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_BYTES && quality > 0.4) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length > MAX_DATA_URL_BYTES) return null;
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [collegeDraft, setCollegeDraft] = useState(user?.college ?? "");
  const [yearDraft, setYearDraft] = useState(user?.year ?? "");
  const [roleDraft, setRoleDraft] = useState(user?.role ?? "");
  const [interestsDraft, setInterestsDraft] = useState(
    user?.interests.join(", ") ?? "",
  );
  const [avatarDraft, setAvatarDraft] = useState<AvatarSource | undefined>(
    user?.avatar,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCollegeDraft(
      normalizeCollegeName(user.college) || user.college.trim(),
    );
    setYearDraft(user.year);
    setRoleDraft(user.role);
    setInterestsDraft(user.interests.join(", "));
    setAvatarDraft(user.avatar);
  }, [user]);

  const collegeSelectOptions = useMemo(() => {
    const c = collegeDraft.trim();
    if (c && !COLLEGE_LIST.includes(c)) {
      return [c, ...OXFORD_COLLEGES];
    }
    return [...OXFORD_COLLEGES];
  }, [collegeDraft]);

  if (!user) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      if (!dataUrl) {
        setError("That image is too big — try a smaller one.");
        return;
      }
      setAvatarDraft({ kind: "image", dataUrl });
    } catch {
      setError("Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  function pickPreset(id: string) {
    setAvatarDraft({ kind: "preset", id });
  }

  function clearAvatar() {
    setAvatarDraft(undefined);
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await updateProfile({
        college: normalizeCollegeName(collegeDraft),
        year: yearDraft.trim(),
        role: roleDraft.trim(),
        avatar: avatarDraft,
        interests: parseInterests(interestsDraft),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      setError("Could not save — try again.");
    } finally {
      setBusy(false);
    }
  }

  const previewChips = parseInterests(interestsDraft);
  const presetActiveId =
    avatarDraft?.kind === "preset" ? avatarDraft.id : null;

  return (
    <SketchCard seed={5} className="p-6">
      <h3 className="font-display text-3xl uppercase tracking-wide">
        Edit my profile
      </h3>
      <p className="mt-1 text-base text-[var(--ink-muted)]">
        College, year, and role are saved with each formal you list. Avatar and
        interests show on browse cards.
      </p>

      <div className="mt-6 flex flex-col gap-4 border-b border-[var(--ink-soft)] pb-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">College</span>
          <select
            value={collegeDraft}
            onChange={(e) => setCollegeDraft(e.target.value)}
            className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] focus:outline-none"
          >
            <option value="">Choose college</option>
            {collegeSelectOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Year</span>
          <input
            type="text"
            value={yearDraft}
            onChange={(e) => setYearDraft(e.target.value)}
            placeholder="2nd year"
            className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Role</span>
          <input
            type="text"
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value)}
            placeholder="Undergraduate"
            className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center sm:justify-start">
          <Avatar name={user.name} size="xl" source={avatarDraft} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Loading…" : "Upload image"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={clearAvatar}
              className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Use initials
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_AVATARS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPreset(p.id)}
                aria-pressed={presetActiveId === p.id}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-[2px] text-xl leading-none transition-colors ${
                  presetActiveId === p.id
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                    : "border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                }`}
              >
                <span className="leading-none">{p.emoji}</span>
              </button>
            ))}
          </div>

          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--ink-soft)] pt-5">
        <p className="text-base text-[var(--ink-muted)]">
          Interests show up on your listings so people know what you&apos;re
          into.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={interestsDraft}
            onChange={(e) => setInterestsDraft(e.target.value)}
            placeholder="rowing, punting, drawing"
            className="flex-1 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
          />
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
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </SketchCard>
  );
}
