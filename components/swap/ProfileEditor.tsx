"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon } from "@/components/ui/Avatar";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import { ProfileIdCard } from "@/components/swap/ProfileIdCard";
import { BadgeCaseModal } from "./BadgeCaseModal";
import { PhotoCropModal } from "./PhotoCropModal";
import { SketchInstagram, SketchWhatsApp } from "@/components/ui/SketchSocial";
import type { AvatarSource } from "@/lib/auth/types";
import { normalizeCollegeName, OXFORD_COLLEGES } from "@/lib/data/colleges";
import { cardRoleLabel, formatYearLabel } from "@/lib/data/format";
import { ROLE_OPTIONS } from "@/lib/data/roles";

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

const MAX_INTEREST_LENGTH = 40;

const DROPDOWN_PANEL =
  "absolute left-0 z-30 min-w-[10rem] rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-2 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]";

const GHOST_INPUT =
  "w-full min-w-0 border-0 border-b border-transparent bg-transparent px-0 py-0 text-inherit placeholder:text-black/30 focus:border-black/35 focus:outline-none";

function normalizeInterest(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_INTEREST_LENGTH);
}

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  registerCancel?: (cancelFn: () => void) => void;
};

export function ProfileEditor({ onDirtyChange, registerSave, registerCancel }: Props) {
  const { user, updateProfile } = useAuth();
  const earnedBadges = useQuery(
    api.badges.getUserBadges,
    user ? { userId: user.id as Id<"users"> } : "skip",
  );
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
  const [badgeCaseOpen, setBadgeCaseOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image.");
      return;
    }
    setError(null);
    setAvatarPickerOpen(false);
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
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

  const rolePrint = cardRoleLabel(roleDraft);
  const yearSuffix = yearDraft
    ? formatYearLabel(yearDraft).replace(/^\d+/, "")
    : " year";

  return (
    <div className="flex flex-col">
      <h1 className="sr-only">My profile</h1>
      {error ? (
        <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      <ProfileIdCard
        className="mx-auto"
        labelledBy="profile-name"
        photo={
          <div ref={avatarPickerRef} className="relative h-full w-full">
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
              className="group relative h-full w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Avatar
                name={nameDraft || user.name}
                size="fill"
                source={avatarDraft}
                square
                className="border-0 bg-[#cfcbc2] text-[#3a3a3a]"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#002147]/0 text-[length:2.8cqi] font-medium uppercase tracking-[0.1em] text-white opacity-0 transition-opacity group-hover:bg-[#002147]/50 group-hover:opacity-100">
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
                className="absolute left-0 top-full z-50 mt-1 w-[min(11rem,70cqi)] rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-3 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]"
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
        }
        name={
          <input
            id="profile-name"
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your full name"
            aria-label="Name"
            className={GHOST_INPUT}
          />
        }
        status={
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-[0.35em]">
            <div ref={rolePickerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setRolePickerOpen((open) => !open);
                  setCollegePickerOpen(false);
                }}
                aria-label="Role"
                aria-expanded={rolePickerOpen}
                className={`border-0 border-b bg-transparent pr-4 font-semibold tracking-wide focus:outline-none ${
                  rolePickerOpen ? "border-black/35" : "border-transparent"
                } ${rolePrint ? "text-inherit" : "text-black/30"}`}
              >
                {rolePrint || "ROLE"}
              </button>
              {rolePickerOpen ? (
                <div className={`${DROPDOWN_PANEL} top-[calc(100%+0.3rem)]`}>
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
            <span className="text-black/55">reading for</span>
            <input
              id="profile-subject"
              type="text"
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              placeholder="subject"
              aria-label="Subject"
              className={`${GHOST_INPUT} min-w-[6em] flex-1`}
            />
          </div>
        }
        college={
          <>
            <span id="profile-college-label" className="sr-only">
              College
            </span>
            <OutlineCombobox
              variant="ghost"
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
              placeholder="College"
              aria-labelledby="profile-college-label"
            />
          </>
        }
        extras={
          <div className="flex flex-col gap-[0.15em]">
            <label className="flex min-w-0 items-center gap-[0.4em]">
              <SketchInstagram className="h-[1.05em] w-[1.05em] text-[#161616]/70" />
              <input
                id="profile-instagram"
                type="text"
                value={instagramHandleDraft}
                onChange={(e) => setInstagramHandleDraft(e.target.value)}
                placeholder="handle"
                aria-label="Instagram"
                className={GHOST_INPUT}
              />
            </label>
            <label className="flex min-w-0 items-center gap-[0.4em]">
              <SketchWhatsApp className="h-[1.05em] w-[1.05em] text-[#161616]/70" />
              <input
                id="profile-whatsapp"
                type="tel"
                inputMode="tel"
                value={whatsappPhoneDraft}
                onChange={(e) => setWhatsappPhoneDraft(e.target.value)}
                placeholder="+44…"
                aria-label="WhatsApp phone"
                className={GHOST_INPUT}
              />
            </label>
            <label className="flex min-w-0 items-baseline gap-[0.35em]">
              <span className="shrink-0 text-black/55">Dietary requirements</span>
              <input
                id="profile-allergens"
                type="text"
                value={dietaryRequirementsDraft}
                onChange={(e) => setDietaryRequirementsDraft(e.target.value)}
                placeholder="none"
                aria-label="Dietary requirements"
                className={GHOST_INPUT}
              />
            </label>
            <div className="flex min-h-[1.2em] flex-wrap items-center gap-[0.25em] border-b border-transparent focus-within:border-black/35">
              {interestsDraft.map((interest, index) => (
                <span
                  key={`${interest}-${index}`}
                  className="inline-flex max-w-full items-center gap-0.5 rounded-sm bg-black/10 px-[0.35em] py-[0.05em] text-[0.95em]"
                >
                  <span className="truncate">{interest}</span>
                  <button
                    type="button"
                    onClick={() => removeInterest(index)}
                    className="inline-flex h-[1em] w-[1em] items-center justify-center text-black/50 hover:text-black"
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
                onBlur={() => {
                  addInterest(interestInput);
                  setInterestInput("");
                }}
                maxLength={MAX_INTEREST_LENGTH}
                placeholder={
                  interestsDraft.length === 0 ? "Add an interest" : ""
                }
                aria-label="Add an interest"
                className="min-w-[5em] flex-1 border-0 bg-transparent py-0 text-inherit placeholder:text-black/30 focus:outline-none"
              />
            </div>
          </div>
        }
        validUntil={
          <label className="flex min-w-0 items-baseline tracking-normal">
            <span className="sr-only">Year of study</span>
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
              size={Math.max(yearDraft.length, 1)}
              className="field-sizing-content w-auto min-w-[0.55em] border-0 border-b border-transparent bg-transparent p-0 font-bold uppercase tracking-normal placeholder:text-black/30 focus:border-black/35 focus:outline-none"
            />
            <span className={yearDraft ? "" : "text-black/30"}>{yearSuffix}</span>
          </label>
        }
        earnedBadges={earnedBadges}
        onOpenBadges={() => setBadgeCaseOpen(true)}
      />

      <PhotoCropModal
        src={cropSrc}
        onClose={() => {
          setCropSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }}
        onConfirm={(dataUrl) => {
          setAvatarDraft({ kind: "image", dataUrl });
          setCropSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }}
      />

      <BadgeCaseModal
        open={badgeCaseOpen}
        onClose={() => setBadgeCaseOpen(false)}
        earned={earnedBadges}
      />

      {saved ? (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">Saved</p>
      ) : null}
    </div>
  );
}
