"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon } from "@/components/ui/Avatar";
import {
  BIO_ERRORS,
  BioCounter,
  BioTextarea,
} from "@/components/ui/BioTextarea";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import type { AvatarSource } from "@/lib/auth/types";
import { normalizeCollegeName, OXFORD_COLLEGES } from "@/lib/data/colleges";
import { ROLE_OPTIONS } from "@/lib/data/roles";
import { FieldError } from "@/components/ui/FieldError";

const TARGET_SIZE = 256;
const MAX_DATA_URL_BYTES = 250 * 1024;

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

const UNDERLINE_INPUT =
  "w-full rounded-xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_16%,transparent)] bg-[var(--bg)] px-3 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--ink)] focus:outline-none";

const SECTION_HEADING =
  "font-display text-xl uppercase leading-none tracking-wide text-[var(--ink)]";

/** A white rounded card grouping related fields, like the rest of the site. */
const GROUP =
  "flex flex-col gap-4 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4 sm:p-5";

const DROPDOWN_PANEL =
  "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-2 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.25)]";

function Field({
  label,
  htmlFor,
  className = "",
  error,
  aside,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  /** Shown at the right end of the label row (e.g. a character counter). */
  aside?: ReactNode;
  /** Shown under the label, so the field name reads first. */
  error?: string | null;
  children: ReactNode;
}) {
  const cls = `flex min-w-0 flex-col gap-1.5 ${className}`.trim();
  const labelRow = (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-semibold text-[var(--ink-muted)]">
        {label}
      </span>
      {aside}
    </span>
  );
  const errorLine = error ? <FieldError>{error}</FieldError> : null;
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={cls}>
        {labelRow}
        {children}
        {errorLine}
      </label>
    );
  }
  return (
    <div className={cls}>
      {labelRow}
      {children}
      {errorLine}
    </div>
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

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  registerCancel?: (cancelFn: () => void) => void;
};

export function ProfileEditor({ onDirtyChange, registerSave, registerCancel }: Props) {
  const { user, updateProfile, saveBio } = useAuth();
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
  const [dietaryConsentDraft, setDietaryConsentDraft] = useState(
    user?.dietaryConsent ?? false,
  );
  const [subjectDraft, setSubjectDraft] = useState(user?.subject ?? "");
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState(user?.bio ?? "");
  const [avatarDraft, setAvatarDraft] = useState<AvatarSource | undefined>(
    user?.avatar,
  );
  const [error, setError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
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
    setDietaryConsentDraft(user.dietaryConsent ?? false);
    setSubjectDraft(user.subject ?? "");
    setBioDraft(user.bio ?? "");
    setAvatarDraft(user.avatar);
    setCollegePickerOpen(false);
    setRolePickerOpen(false);
    setAvatarPickerOpen(false);
    setError(null);
    setBioError(null);
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
  const initialDietaryConsent = user?.dietaryConsent ?? false;
  // Saved before the opt-in existed: kept, but re-confirmed on the next edit.
  const legacyDietary = !!initialDietaryRequirements && !initialDietaryConsent;
  const initialSubject = user?.subject?.trim() ?? "";
  const initialBio = user?.bio?.trim() ?? "";
  const initialAvatar = user?.avatar;

  const profileDirty =
    normalizedName !== initialName ||
    normalizedCollege !== initialCollege ||
    normalizedYear !== initialYear ||
    normalizedRole !== initialRole ||
    instagramHandleDraft.trim() !== initialInstagramHandle ||
    whatsappPhoneDraft.trim() !== initialWhatsappPhone ||
    dietaryRequirementsDraft.trim() !== initialDietaryRequirements ||
    dietaryConsentDraft !== initialDietaryConsent ||
    subjectDraft.trim() !== initialSubject ||
    bioDraft.trim() !== initialBio ||
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
        setError("Image too big.");
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

  /** Returns whether everything saved. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setError(null);
    setBioError(null);
    setBusy(true);
    try {
      const trimmedName = nameDraft.trim();
      if (!trimmedName) {
        setError("Name cannot be empty.");
        return false;
      }
      const normalizedYear = yearDraft.trim();
      if (!/^\d+$/.test(normalizedYear)) {
        setError("Year must be a number, e.g. 2.");
        return false;
      }
      // Dietary requirements are only stored with the opt-in ticked. Unticked
      // and blank (or unticked after opting in) withdraws; an untouched legacy
      // value is left alone.
      const dietText = dietaryRequirementsDraft.trim();
      let dietary: { dietaryRequirements?: string; dietaryConsent?: boolean } =
        {};
      if (dietaryConsentDraft) {
        dietary = { dietaryRequirements: dietText, dietaryConsent: true };
      } else if (!dietText || initialDietaryConsent) {
        dietary = { dietaryRequirements: "", dietaryConsent: false };
      } else if (dietText !== initialDietaryRequirements) {
        setError(
          "Tick the box to share your dietary requirements, or leave them blank.",
        );
        return false;
      }
      if (bioDraft.trim() !== initialBio) {
        const result = await saveBio(bioDraft);
        if (!result.ok) {
          setBioError(BIO_ERRORS[result.reason]);
          return false;
        }
      }
      await updateProfile({
        name: trimmedName,
        college: normalizeCollegeName(collegeDraft),
        year: normalizedYear,
        role: roleDraft.trim(),
        instagramHandle: instagramHandleDraft.trim(),
        whatsappPhone: whatsappPhoneDraft.trim(),
        ...dietary,
        subject: subjectDraft.trim(),
        avatar: avatarDraft,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      return true;
    } catch {
      setError("Could not save — try again.");
      return false;
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
    dietaryConsentDraft,
    initialDietaryConsent,
    initialDietaryRequirements,
    subjectDraft,
    avatarDraft,
    bioDraft,
    initialBio,
    saveBio,
  ]);

  useEffect(() => {
    onDirtyChange?.(profileDirty);
  }, [profileDirty, onDirtyChange]);

  useEffect(() => {
    registerSave?.(async () => {
      if (!profileDirty || busy) return;
      // Throw so the page's Save button doesn't report "Saved"; the reason is
      // already shown inline.
      if (!(await save())) throw new Error("Profile not saved");
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

  return (
    <div className="flex flex-col gap-4">
        <div ref={avatarPickerRef} className="relative flex flex-col items-center gap-2">
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
          <button
            type="button"
            onClick={() => {
              setAvatarPickerOpen((open) => !open);
              setCollegePickerOpen(false);
              setRolePickerOpen(false);
            }}
            className="cursor-pointer text-sm font-bold text-[var(--accent)] hover:underline"
          >
            Change photo
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
              className="absolute left-1/2 top-[calc(100%+0.4rem)] z-30 w-44 -translate-x-1/2 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-3 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]"
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

      <section className={GROUP} aria-labelledby="profile-about-heading">
        <h2 id="profile-about-heading" className={SECTION_HEADING}>
          About you
        </h2>
          <Field label="Name" htmlFor="profile-name">
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
          <Field
            label="Bio"
            htmlFor="profile-bio"
            error={bioError}
            aside={<BioCounter value={bioDraft} />}
          >
            <BioTextarea
              hideCounter
              id="profile-bio"
              value={bioDraft}
              onChange={(next) => {
                setBioDraft(next);
                setBioError(null);
              }}
              className={UNDERLINE_INPUT}
            />
          </Field>
      </section>

      <section className={GROUP} aria-labelledby="profile-oxford-heading">
        <h2 id="profile-oxford-heading" className={SECTION_HEADING}>
          Oxford
        </h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <Field label="College">
              <OutlineCombobox
                variant="filled"
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
            <Field label="Year" htmlFor="profile-year">
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
            <Field label="Role">
              <div ref={rolePickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setRolePickerOpen((open) => !open);
                    setCollegePickerOpen(false);
                  }}
                  className={`w-full rounded-xl border-[1.5px] bg-[var(--bg)] px-3 py-2.5 pr-9 text-left text-base focus:outline-none ${
                    rolePickerOpen
                      ? "border-[var(--ink)]"
                      : "border-[color-mix(in_srgb,var(--ink)_16%,transparent)] focus:border-[var(--ink)]"
                  } ${roleDraft ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}
                >
                  {roleDraft || "Choose role"}
                </button>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--ink-muted)]">
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
            <Field label="Subject" htmlFor="profile-subject">
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
      </section>

      <section className={GROUP} aria-labelledby="profile-formal-heading">
        <h2 id="profile-formal-heading" className={SECTION_HEADING}>
          Formals
        </h2>
          <Field label="Allergens or diet" htmlFor="profile-allergens">
            <input
              id="profile-allergens"
              type="text"
              value={dietaryRequirementsDraft}
              onChange={(e) => setDietaryRequirementsDraft(e.target.value)}
              placeholder="e.g. Vegetarian, nut allergy"
              className={UNDERLINE_INPUT}
            />
          </Field>
          <p className="text-xs text-[var(--ink-muted)]">
            Only shared with people you&apos;re matched with for a formal.
          </p>
          <label className="flex items-start gap-2.5 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={dietaryConsentDraft}
              onChange={(e) => setDietaryConsentDraft(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>Share my dietary requirements with my formal matches</span>
          </label>
          {legacyDietary && !dietaryConsentDraft ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Tick the box to confirm you&apos;re happy to keep sharing these.
            </p>
          ) : null}
      </section>

      <section className={GROUP} aria-labelledby="profile-socials-heading">
        <h2 id="profile-socials-heading" className={SECTION_HEADING}>
          Contact
        </h2>
        <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
          <Field label="Instagram" htmlFor="profile-instagram">
            <input
              id="profile-instagram"
              type="text"
              value={instagramHandleDraft}
              onChange={(e) => setInstagramHandleDraft(e.target.value)}
              placeholder="@yourhandle"
              className={UNDERLINE_INPUT}
            />
          </Field>
          <Field label="WhatsApp" htmlFor="profile-whatsapp">
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
        <p className="text-xs text-[var(--ink-muted)]">
          Only shown to people you&apos;re going to a formal with.
        </p>
      </section>

      {saved ? (
        <p className="text-sm text-[var(--ink-muted)]">Saved</p>
      ) : null}
    </div>
  );
}

