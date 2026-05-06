"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon } from "@/components/ui/Avatar";
import { SketchCard } from "@/components/ui/SketchCard";
import type { AvatarSource } from "@/lib/auth/types";
import { normalizeCollegeName, OXFORD_COLLEGES } from "@/lib/data/colleges";

const TARGET_SIZE = 256;
const MAX_DATA_URL_BYTES = 250 * 1024;

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];
const ROLE_OPTIONS = ["Undergrad", "Masters", "DPhil"] as const;

function normalizeInterest(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function renderHighlightedMatch(label: string, query: string) {
  const q = query.trim();
  if (!q) return label;
  const lowerLabel = label.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const start = lowerLabel.indexOf(lowerQuery);
  if (start < 0) return label;
  const end = start + q.length;
  return (
    <>
      {label.slice(0, start)}
      <mark className="rounded bg-[var(--accent)]/25 px-0.5 text-current">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
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
  const collegePickerRef = useRef<HTMLDivElement | null>(null);
  const rolePickerRef = useRef<HTMLDivElement | null>(null);

  const [collegeDraft, setCollegeDraft] = useState(user?.college ?? "");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegePickerOpen, setCollegePickerOpen] = useState(false);
  const [yearDraft, setYearDraft] = useState(user?.year ?? "");
  const [roleDraft, setRoleDraft] = useState(user?.role ?? "");
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [interestsDraft, setInterestsDraft] = useState<string[]>(
    user?.interests ?? [],
  );
  const [interestInput, setInterestInput] = useState("");
  const [avatarDraft, setAvatarDraft] = useState<AvatarSource | undefined>(
    user?.avatar,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const normalizedCollege =
      normalizeCollegeName(user.college) || user.college.trim();
    setCollegeDraft(normalizedCollege);
    setCollegeSearch(normalizedCollege);
    setYearDraft(user.year);
    setRoleDraft(user.role);
    setInterestsDraft(user.interests);
    setAvatarDraft(user.avatar);
  }, [user]);

  useEffect(() => {
    if (!collegePickerOpen && !rolePickerOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedOutsideCollege = collegePickerRef.current
        ? !collegePickerRef.current.contains(target)
        : true;
      const clickedOutsideRole = rolePickerRef.current
        ? !rolePickerRef.current.contains(target)
        : true;
      if (clickedOutsideCollege) {
        setCollegePickerOpen(false);
      }
      if (clickedOutsideRole) {
        setRolePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [collegePickerOpen, rolePickerOpen]);

  const collegeSelectOptions = useMemo(() => {
    const c = collegeDraft.trim();
    if (c && !COLLEGE_LIST.includes(c)) {
      return [c, ...OXFORD_COLLEGES];
    }
    return [...OXFORD_COLLEGES];
  }, [collegeDraft]);

  const filteredCollegeOptions = useMemo(() => {
    const q = collegeSearch.trim().toLowerCase();
    if (!q) return collegeSelectOptions;
    return collegeSelectOptions.filter((college) =>
      college.toLowerCase().includes(q),
    );
  }, [collegeSearch, collegeSelectOptions]);

  const roleSelectOptions = useMemo(() => {
    const role = roleDraft.trim();
    if (role && !ROLE_OPTIONS.includes(role as (typeof ROLE_OPTIONS)[number])) {
      return [role, ...ROLE_OPTIONS];
    }
    return [...ROLE_OPTIONS];
  }, [roleDraft]);

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
      const normalizedYear = yearDraft.trim();
      if (!/^\d+$/.test(normalizedYear)) {
        setError("Year must be a number, e.g. 2.");
        return;
      }
      await updateProfile({
        college: normalizeCollegeName(collegeDraft),
        year: normalizedYear,
        role: roleDraft.trim(),
        avatar: avatarDraft,
        interests: interestsDraft,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      setError("Could not save — try again.");
    } finally {
      setBusy(false);
    }
  }

  const presetActiveId =
    avatarDraft?.kind === "preset" ? avatarDraft.id : null;

  function addInterest(raw: string) {
    const next = normalizeInterest(raw);
    if (!next) return;
    if (
      interestsDraft.some((interest) => interest.toLowerCase() === next.toLowerCase())
    ) {
      return;
    }
    setInterestsDraft((prev) => [...prev, next]);
  }

  function removeInterest(index: number) {
    setInterestsDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function onInterestKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addInterest(interestInput);
    setInterestInput("");
  }

  return (
    <SketchCard seed={5} className="p-6">
      <h3 className="font-display text-3xl uppercase tracking-wide">
        Edit my profile
      </h3>
      <p className="mt-1 text-base text-[var(--ink-muted)]">
        College, year, and role are saved with each formal you list. Avatar and
        interests show on browse cards.
      </p>

      <div className="mt-6 border-b border-[var(--ink-soft)] pb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">College</span>
              <div ref={collegePickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCollegePickerOpen((open) => !open);
                    setRolePickerOpen(false);
                    setCollegeSearch(collegeDraft);
                  }}
                  className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 pr-12 text-left text-base text-[var(--ink)] focus:outline-none"
                >
                  {collegeDraft || "Choose college"}
                </button>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--ink-muted)]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 8"
                    className="h-3.5 w-3.5"
                    fill="none"
                  >
                    <path
                      d="M1 1.5 6 6.5 11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {collegePickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--bg)] p-2 shadow-sm">
                    <input
                      type="text"
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      placeholder="Search college"
                      className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      {filteredCollegeOptions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {filteredCollegeOptions.map((college) => {
                            const selected = college === collegeDraft;
                            return (
                              <button
                                key={college}
                                type="button"
                                onClick={() => {
                                  setCollegeDraft(college);
                                  setCollegeSearch(college);
                                  setCollegePickerOpen(false);
                                }}
                                className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                                  selected
                                    ? "bg-[var(--ink)] text-[var(--bg)]"
                                    : "text-[var(--ink)] hover:bg-[var(--paper)]"
                                }`}
                              >
                                {renderHighlightedMatch(college, collegeSearch)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="px-2 py-2 text-sm text-[var(--ink-muted)]">
                          No colleges match that search.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Year</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d+"
                value={yearDraft}
                onChange={(e) =>
                  setYearDraft(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                placeholder="2"
                className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Role</span>
              <div ref={rolePickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setRolePickerOpen((open) => !open);
                    setCollegePickerOpen(false);
                  }}
                  className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 pr-12 text-left text-base text-[var(--ink)] focus:outline-none"
                >
                  {roleDraft || "Choose role"}
                </button>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--ink-muted)]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 8"
                    className="h-3.5 w-3.5"
                    fill="none"
                  >
                    <path
                      d="M1 1.5 6 6.5 11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {rolePickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--bg)] p-2 shadow-sm">
                    <div className="flex flex-col gap-1">
                      {roleSelectOptions.map((option) => {
                        const selected = option === roleDraft;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setRoleDraft(option);
                              setRolePickerOpen(false);
                            }}
                            className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              selected
                                ? "bg-[var(--ink)] text-[var(--bg)]"
                                : "text-[var(--ink)] hover:bg-[var(--paper)]"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>
          </div>

          <div className="flex w-full max-w-[22rem] flex-col items-center gap-4 self-center lg:w-[22rem] lg:shrink-0">
            <div className="flex w-full items-center justify-center gap-3">
              <Avatar name={user.name} size="xl" source={avatarDraft} />
              <div className="flex flex-col gap-2">
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
            </div>

            <div className="grid w-fit grid-cols-4 gap-1 self-center">
              {PRESET_AVATARS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPreset(p.id)}
                  aria-pressed={presetActiveId === p.id}
                  aria-label={`Use ${p.label} avatar`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-[2px] text-xl leading-none transition-colors ${
                    presetActiveId === p.id
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                      : "border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                  }`}
                >
                  <PresetAvatarIcon id={p.id} className="h-5 w-5" />
                </button>
              ))}
            </div>

            {error ? (
              <p className="text-center text-sm text-[var(--danger)] lg:text-left">
                {error}
              </p>
            ) : null}
            </div>
          </div>
        </div>

      <div className="mt-6 pt-5">
        <p className="text-base text-[var(--ink-muted)]">
          Interests show up on your listings so people know what you&apos;re
          into.
        </p>
        <div className="mt-3">
          <div className="rounded-3xl border-[2px] border-[var(--ink)] bg-[var(--bg)] px-3 py-3">
            {interestsDraft.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {interestsDraft.map((interest, index) => (
                  <span
                    key={`${interest}-${index}`}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-sm text-[var(--ink)]"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(index)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                      aria-label={`Remove ${interest}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={onInterestKeyDown}
              placeholder="Type an interest and press Enter"
              className="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
            />
          </div>
        </div>

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
