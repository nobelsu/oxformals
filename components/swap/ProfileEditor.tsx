"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon } from "@/components/ui/Avatar";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import type { AvatarSource } from "@/lib/auth/types";
import { normalizeCollegeName, OXFORD_COLLEGES } from "@/lib/data/colleges";
import { ROLE_OPTIONS } from "@/lib/data/roles";

const TARGET_SIZE = 256;
const MAX_DATA_URL_BYTES = 250 * 1024;

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

const MAX_INTEREST_LENGTH = 40;

const UNDERLINE_INPUT =
  "w-full border-0 border-b-[1.5px] border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-transparent px-0 py-1.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--ink)] focus:outline-none";

const SECTION_HEADING =
  "font-display text-[1.75rem] leading-tight text-[var(--ink)]";

const DROPDOWN_PANEL =
  "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-2 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.25)]";

function Field({
  label,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = `flex min-w-0 flex-col gap-1 ${className}`.trim();
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={cls}>
        {children}
        <span className="text-xs tracking-wide text-[var(--ink-muted)]">
          {label}
        </span>
      </label>
    );
  }
  return (
    <div className={cls}>
      {children}
      <span className="text-xs tracking-wide text-[var(--ink-muted)]">
        {label}
      </span>
    </div>
  );
}

function normalizeInterest(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_INTEREST_LENGTH);
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

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  registerCancel?: (cancelFn: () => void) => void;
};

export function ProfileEditor({ onDirtyChange, registerSave, registerCancel }: Props) {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rolePickerRef = useRef<HTMLDivElement | null>(null);
  const avatarPickerRef = useRef<HTMLDivElement | null>(null);

  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [collegeDraft, setCollegeDraft] = useState(user?.college ?? "");
  const [collegePickerOpen, setCollegePickerOpen] = useState(false);
  const [yearDraft, setYearDraft] = useState(user?.year ?? "");
  const [roleDraft, setRoleDraft] = useState(user?.role ?? "");
  const [instagramHandleDraft, setInstagramHandleDraft] = useState(
    user?.instagramHandle ?? "",
  );
  const [whatsappPhoneDraft, setWhatsappPhoneDraft] = useState(
    user?.whatsappPhone ?? "",
  );
  const [dietaryRequirementsDraft, setDietaryRequirementsDraft] = useState(
    user?.dietaryRequirements ?? "",
  );
  const [subjectDraft, setSubjectDraft] = useState(user?.subject ?? "");
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
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

  const resetDraftsFromUser = useCallback(() => {
    if (!user) return;
    setNameDraft(user.name);
    const normalizedCollege =
      normalizeCollegeName(user.college) || user.college.trim();
    setCollegeDraft(normalizedCollege);
    setYearDraft(user.year);
    setRoleDraft(user.role);
    setInstagramHandleDraft(user.instagramHandle ?? "");
    setWhatsappPhoneDraft(user.whatsappPhone ?? "");
    setDietaryRequirementsDraft(user.dietaryRequirements ?? "");
    setSubjectDraft(user.subject ?? "");
    setInterestsDraft(user.interests);
    setAvatarDraft(user.avatar);
    setCollegePickerOpen(false);
    setRolePickerOpen(false);
    setAvatarPickerOpen(false);
    setError(null);
    setInterestInput("");
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      resetDraftsFromUser();
    });
  }, [user, resetDraftsFromUser]);

  useEffect(() => {
    if (!rolePickerOpen && !avatarPickerOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rolePickerOpen &&
        rolePickerRef.current &&
        !rolePickerRef.current.contains(target)
      ) {
        setRolePickerOpen(false);
      }
      if (
        avatarPickerOpen &&
        avatarPickerRef.current &&
        !avatarPickerRef.current.contains(target)
      ) {
        setAvatarPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [rolePickerOpen, avatarPickerOpen]);

  const collegeSelectOptions = useMemo(() => {
    const c = collegeDraft.trim();
    if (c && !COLLEGE_LIST.includes(c)) {
      return [c, ...OXFORD_COLLEGES];
    }
    return [...OXFORD_COLLEGES];
  }, [collegeDraft]);

  const collegeComboboxOptions = useMemo(
    () => collegeSelectOptions.map((c) => ({ value: c, label: c })),
    [collegeSelectOptions],
  );

  const roleSelectOptions = useMemo(() => {
    const role = roleDraft.trim();
    if (role && !ROLE_OPTIONS.includes(role as (typeof ROLE_OPTIONS)[number])) {
      return [role, ...ROLE_OPTIONS];
    }
    return [...ROLE_OPTIONS];
  }, [roleDraft]);

  const normalizedName = nameDraft.trim();
  const normalizedCollege = normalizeCollegeName(collegeDraft);
  const normalizedYear = yearDraft.trim();
  const normalizedRole = roleDraft.trim();
  const initialName = user?.name.trim() ?? "";
  const initialCollege = user
    ? normalizeCollegeName(user.college) || user.college.trim()
    : "";
  const initialYear = user?.year.trim() ?? "";
  const initialRole = user?.role.trim() ?? "";
  const initialInstagramHandle = user?.instagramHandle?.trim() ?? "";
  const initialWhatsappPhone = user?.whatsappPhone?.trim() ?? "";
  const initialDietaryRequirements = user?.dietaryRequirements?.trim() ?? "";
  const initialSubject = user?.subject?.trim() ?? "";
  const initialInterests = user?.interests ?? [];
  const initialAvatar = user?.avatar;

  const profileDirty =
    normalizedName !== initialName ||
    normalizedCollege !== initialCollege ||
    normalizedYear !== initialYear ||
    normalizedRole !== initialRole ||
    instagramHandleDraft.trim() !== initialInstagramHandle ||
    whatsappPhoneDraft.trim() !== initialWhatsappPhone ||
    dietaryRequirementsDraft.trim() !== initialDietaryRequirements ||
    subjectDraft.trim() !== initialSubject ||
    JSON.stringify(interestsDraft) !== JSON.stringify(initialInterests) ||
    JSON.stringify(avatarDraft ?? null) !== JSON.stringify(initialAvatar ?? null);

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
      setAvatarPickerOpen(false);
    } catch {
      setError("Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  function pickPreset(id: string) {
    setAvatarDraft({ kind: "preset", id });
    setAvatarPickerOpen(false);
  }

  function clearAvatar() {
    setAvatarDraft(undefined);
    setAvatarPickerOpen(false);
  }

  const save = useCallback(async () => {
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      const trimmedName = nameDraft.trim();
      if (!trimmedName) {
        setError("Name cannot be empty.");
        return;
      }
      const normalizedYear = yearDraft.trim();
      if (!/^\d+$/.test(normalizedYear)) {
        setError("Year must be a number, e.g. 2.");
        return;
      }
      await updateProfile({
        name: trimmedName,
        college: normalizeCollegeName(collegeDraft),
        year: normalizedYear,
        role: roleDraft.trim(),
        instagramHandle: instagramHandleDraft.trim(),
        whatsappPhone: whatsappPhoneDraft.trim(),
        dietaryRequirements: dietaryRequirementsDraft.trim(),
        subject: subjectDraft.trim(),
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
  }, [
    user,
    nameDraft,
    yearDraft,
    updateProfile,
    collegeDraft,
    roleDraft,
    instagramHandleDraft,
    whatsappPhoneDraft,
    dietaryRequirementsDraft,
    subjectDraft,
    avatarDraft,
    interestsDraft,
  ]);

  useEffect(() => {
    onDirtyChange?.(profileDirty);
  }, [profileDirty, onDirtyChange]);

  useEffect(() => {
    registerSave?.(async () => {
      if (!profileDirty || busy) return;
      await save();
    });
  }, [registerSave, profileDirty, busy, save]);

  useEffect(() => {
    registerCancel?.(() => {
      resetDraftsFromUser();
    });
  }, [registerCancel, resetDraftsFromUser]);

  if (!user) return null;

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
    <div className="flex flex-col">
      <h1 className={SECTION_HEADING}>Edit my profile</h1>
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div ref={avatarPickerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setAvatarPickerOpen((open) => !open);
              setCollegePickerOpen(false);
              setRolePickerOpen(false);
            }}
            disabled={busy}
            aria-expanded={avatarPickerOpen}
            aria-haspopup="dialog"
            aria-label={busy ? "Loading photo" : "Change profile picture"}
            className="group relative rounded-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Avatar name={user.name} size="2xl" source={avatarDraft} />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-[var(--ink)]/0 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--accent-ink)] opacity-0 transition-opacity group-hover:bg-[var(--ink)]/45 group-hover:opacity-100">
              {busy ? "…" : "Change"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {avatarPickerOpen ? (
            <div
              role="dialog"
              aria-label="Choose a profile picture"
              className="absolute left-0 top-[calc(100%+0.65rem)] z-30 w-44 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-3 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]"
            >
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AVATARS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickPreset(p.id)}
                    aria-pressed={presetActiveId === p.id}
                    aria-label={`Use ${p.label} avatar`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] text-[var(--ink)] transition-colors ${
                      presetActiveId === p.id
                        ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                        : "border-[color-mix(in_srgb,var(--ink)_22%,transparent)] hover:border-[var(--ink)]"
                    }`}
                  >
                    <PresetAvatarIcon id={p.id} className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--ink)_12%,transparent)] pt-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="text-left text-xs text-[var(--ink)] transition-colors hover:text-[var(--accent)] disabled:opacity-60"
                >
                  {busy ? "Loading…" : "Upload photo"}
                </button>
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="text-left text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                >
                  Use initials
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <Field label="name" htmlFor="profile-name" className="max-w-[12rem]">
            <input
              id="profile-name"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your full name"
              className={UNDERLINE_INPUT}
            />
          </Field>

          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
            <Field label="college">
              <OutlineCombobox
                variant="underline"
                open={collegePickerOpen}
                onOpenChange={(next) => {
                  setCollegePickerOpen(next);
                  if (next) setRolePickerOpen(false);
                }}
                value={collegeDraft}
                options={collegeComboboxOptions}
                onChange={(v) => {
                  setCollegeDraft(v);
                  setCollegePickerOpen(false);
                }}
                placeholder="Choose college"
              />
            </Field>

            <Field label="year" htmlFor="profile-year">
              <input
                id="profile-year"
                type="text"
                inputMode="numeric"
                pattern="\d+"
                value={yearDraft}
                onChange={(e) =>
                  setYearDraft(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                placeholder="2"
                className={UNDERLINE_INPUT}
              />
            </Field>

            <Field label="role">
              <div ref={rolePickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setRolePickerOpen((open) => !open);
                    setCollegePickerOpen(false);
                  }}
                  className={`w-full rounded-none border-0 border-b-[1.5px] bg-transparent py-1.5 pr-7 text-left text-base focus:outline-none ${
                    rolePickerOpen
                      ? "border-[var(--ink)]"
                      : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] focus:border-[var(--ink)]"
                  } ${roleDraft ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}
                >
                  {roleDraft || "Choose role"}
                </button>
                <span className="pointer-events-none absolute right-0 top-2.5 text-[var(--ink-muted)]">
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
                  <div className={DROPDOWN_PANEL}>
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
                                : "text-[var(--ink)] hover:bg-[var(--bg)]"
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
            </Field>

            <Field label="subject" htmlFor="profile-subject">
              <input
                id="profile-subject"
                type="text"
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                placeholder="e.g. PPE"
                className={UNDERLINE_INPUT}
              />
            </Field>
          </div>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="profile-socials-heading">
        <h2 id="profile-socials-heading" className={SECTION_HEADING}>
          Socials
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="instagram" htmlFor="profile-instagram">
            <input
              id="profile-instagram"
              type="text"
              value={instagramHandleDraft}
              onChange={(e) => setInstagramHandleDraft(e.target.value)}
              placeholder="@yourhandle"
              className={UNDERLINE_INPUT}
            />
          </Field>
          <Field label="whatsapp phone #" htmlFor="profile-whatsapp">
            <input
              id="profile-whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsappPhoneDraft}
              onChange={(e) => setWhatsappPhoneDraft(e.target.value)}
              placeholder="+44 7..."
              className={UNDERLINE_INPUT}
            />
          </Field>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="profile-formal-heading">
        <h2 id="profile-formal-heading" className={SECTION_HEADING}>
          Formal-stuff
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="allergens?" htmlFor="profile-allergens">
            <input
              id="profile-allergens"
              type="text"
              value={dietaryRequirementsDraft}
              onChange={(e) => setDietaryRequirementsDraft(e.target.value)}
              placeholder="e.g. Vegetarian, nut allergy"
              className={UNDERLINE_INPUT}
            />
          </Field>

          <Field label="interests">
            <div className="flex min-h-[2.35rem] flex-wrap items-center gap-1.5 border-b-[1.5px] border-[color-mix(in_srgb,var(--ink)_28%,transparent)] pb-1.5 focus-within:border-[var(--ink)]">
              {interestsDraft.map((interest, index) => (
                <span
                  key={`${interest}-${index}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-2.5 py-0.5 text-sm text-[var(--ink)]"
                >
                  <span className="truncate">{interest}</span>
                  <button
                    type="button"
                    onClick={() => removeInterest(index)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                    aria-label={`Remove ${interest}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                enterKeyHint="done"
                value={interestInput}
                onChange={(e) =>
                  setInterestInput(e.target.value.slice(0, MAX_INTEREST_LENGTH))
                }
                onKeyDown={onInterestKeyDown}
                maxLength={MAX_INTEREST_LENGTH}
                placeholder={
                  interestsDraft.length === 0 ? "Type an interest…" : ""
                }
                aria-label="Add an interest"
                className="min-w-[6rem] flex-1 border-0 bg-transparent py-0.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  addInterest(interestInput);
                  setInterestInput("");
                }}
                disabled={!normalizeInterest(interestInput)}
                aria-label="Add interest"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:pointer-events-none disabled:opacity-30"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            </div>
          </Field>
        </div>
      </section>

      {saved ? (
        <p className="mt-6 text-sm text-[var(--ink-muted)]">Saved</p>
      ) : null}
    </div>
  );
}

