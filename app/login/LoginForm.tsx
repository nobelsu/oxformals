"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useAuth } from "@/components/auth/useAuth";
import { SketchCard } from "@/components/ui/SketchCard";
import { normalizeCollegeName, OXFORD_COLLEGES } from "@/lib/data/colleges";

type Step = "email" | "code" | "profile";
const ROLE_OPTIONS = ["Undergrad", "Masters", "DPhil"] as const;
const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isOxfordEmail(email: string): boolean {
  return email.endsWith("@ox.ac.uk");
}

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

function formatVerifyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("could not verify") || lower.includes("invalid")) {
    return "That code doesn't match or has expired. Try again or request a new code.";
  }
  if (lower.includes("expired")) {
    return "That code has expired. Request a new one.";
  }
  return "Could not verify the code — try again or request a new code.";
}

export function LoginForm() {
  const {
    status,
    isAuthenticated,
    needsOnboarding,
    authEmail,
    signOut,
    requestCode,
    verifyCode,
    completeSignup,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState("");
  const [role, setRole] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegePickerOpen, setCollegePickerOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collegePickerRef = useRef<HTMLDivElement | null>(null);
  const rolePickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "ready" && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [status, isAuthenticated, nextPath, router]);

  useEffect(() => {
    if (status !== "ready" || !needsOnboarding) return;
    setStep("profile");
    if (authEmail) {
      setEmail(authEmail);
    }
  }, [status, needsOnboarding, authEmail]);

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
    const c = college.trim();
    if (c && !COLLEGE_LIST.includes(c)) {
      return [c, ...OXFORD_COLLEGES];
    }
    return [...OXFORD_COLLEGES];
  }, [college]);

  const filteredCollegeOptions = useMemo(() => {
    const q = collegeSearch.trim().toLowerCase();
    if (!q) return collegeSelectOptions;
    return collegeSelectOptions.filter((collegeOption) =>
      collegeOption.toLowerCase().includes(q),
    );
  }, [collegeSearch, collegeSelectOptions]);

  const roleSelectOptions = useMemo(() => {
    const trimmedRole = role.trim();
    if (
      trimmedRole &&
      !ROLE_OPTIONS.includes(trimmedRole as (typeof ROLE_OPTIONS)[number])
    ) {
      return [trimmedRole, ...ROLE_OPTIONS];
    }
    return [...ROLE_OPTIONS];
  }, [role]);

  async function onEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) {
      setError("That doesn't look like an email.");
      return;
    }
    if (!isOxfordEmail(normalized)) {
      setError("Use your Oxford email address ending in @ox.ac.uk.");
      return;
    }
    setSubmitting(true);
    try {
      const signInResult = await requestCode(normalized);
      setEmail(normalized);
      if (signInResult.status === "code-sent") {
        setStep("code");
        setCode("");
      }
    } catch {
      setError("Could not send the code — check your email and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyCode(email.trim(), trimmedCode);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not verify the code.";
      setError(formatVerifyError(msg));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendCode() {
    setError(null);
    setSubmitting(true);
    try {
      await requestCode(email.trim());
      setCode("");
    } catch {
      setError("Could not resend the code — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !college.trim() || !year.trim() || !role.trim() || !whatsappPhone.trim()) {
      setError("Add name, college, year, role, and phone number — it only takes a moment.");
      return;
    }
    const normalizedYear = year.trim();
    if (!/^\d+$/.test(normalizedYear)) {
      setError("Year must be a number, e.g. 2.");
      return;
    }
    setSubmitting(true);
    try {
      await completeSignup({
        email: email.trim(),
        name: name.trim(),
        college: normalizeCollegeName(college),
        year: normalizedYear,
        role: role.trim(),
        interests,
        instagramHandle: instagramHandle.trim() || undefined,
        whatsappPhone: whatsappPhone.trim() || undefined,
      });
      router.replace(nextPath);
    } catch {
      setError("Could not save your profile — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2.5 text-base focus:outline-none focus:border-[var(--accent-hover)]";
  function addInterest(raw: string) {
    const next = normalizeInterest(raw);
    if (!next) return;
    if (interests.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    setInterests((prev) => [...prev, next]);
  }

  function removeInterest(index: number) {
    setInterests((prev) => prev.filter((_, i) => i !== index));
  }

  function onInterestKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addInterest(interestInput);
    setInterestInput("");
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 py-16 bg-[var(--bg)]">
      <SketchCard className={`w-full p-8 ${step === "profile" ? "max-w-lg" : "max-w-sm"}`} seed={3}>
        <header className="mb-6 text-center">
          <h1 className="font-display text-5xl tracking-wide uppercase">
            Oxformals
          </h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Find your next formal.
          </p>
        </header>

        {step === "email" ? (
          <form onSubmit={onEmailSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">
                Enter your Oxford email
              </span>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sso@ox.ac.uk"
                className={inputCls}
              />
            </label>

            {error && (
              <p className="text-sm text-[var(--danger)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 text-base transition-colors"
            >
              {submitting ? "Sending…" : "Send code"}
            </button>

            <p className="text-center text-xs text-[var(--ink-soft)]">
              Let&apos;s get you to dinner.
            </p>
          </form>
        ) : step === "code" ? (
          <form onSubmit={onCodeSubmit} className="flex flex-col gap-4">
            <p className="text-[var(--ink-muted)] text-center leading-relaxed">
              Enter the 6-digit code we sent to{" "}
              <span className="text-[var(--ink)] font-medium">{email}</span>.
            </p>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Code</span>
              <input
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className={`${inputCls} text-center tracking-[0.35em] font-mono text-lg`}
              />
            </label>

            {error && (
              <p className="text-sm text-[var(--danger)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full cursor-pointer rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 text-base transition-colors"
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>

            <button
              type="button"
              disabled={submitting}
              className="w-full cursor-pointer rounded-full border-[2px] border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-2.5 transition-colors disabled:opacity-60 text-sm"
              onClick={() => void onResendCode()}
            >
              Resend code
            </button>

            <button
              type="button"
              disabled={submitting}
              className="text-center text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>

            <p className="text-xs text-[var(--ink-soft)] text-center leading-relaxed">
              Check promotions or spam. Codes expire after 10 minutes.
            </p>
          </form>
        ) : (
          <form onSubmit={onProfileSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-[var(--ink-muted)]">
              You&apos;re signed in — a few details so we can seat you.
            </p>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Name</span>
              <input
                type="text"
                autoComplete="name"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">College</span>
              <div ref={collegePickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCollegePickerOpen((open) => !open);
                    setRolePickerOpen(false);
                    setCollegeSearch(college);
                  }}
                  className={`${inputCls} pr-12 text-left`}
                >
                  {college || "Choose college"}
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
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--paper)] p-2 shadow-sm">
                    <input
                      type="text"
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      placeholder="Search college"
                      className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      {filteredCollegeOptions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {filteredCollegeOptions.map((collegeOption) => {
                            const selected = collegeOption === college;
                            return (
                              <button
                                key={collegeOption}
                                type="button"
                                onClick={() => {
                                  setCollege(collegeOption);
                                  setCollegeSearch(collegeOption);
                                  setCollegePickerOpen(false);
                                }}
                                className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                                  selected
                                    ? "bg-[var(--ink)] text-[var(--bg)]"
                                    : "text-[var(--ink)] hover:bg-[var(--bg)]"
                                }`}
                              >
                                {renderHighlightedMatch(collegeOption, collegeSearch)}
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

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-[var(--ink-muted)]">Year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d+"
                  required
                  value={year}
                  onChange={(e) =>
                    setYear(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="2"
                  className={inputCls}
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
                    className={`${inputCls} pr-12 text-left`}
                  >
                    {role || "Choose role"}
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
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--paper)] p-2 shadow-sm">
                      <div className="flex flex-col gap-1">
                        {roleSelectOptions.map((option) => {
                          const selected = option === role;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setRole(option);
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
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="interest-input" className="text-sm text-[var(--ink-muted)]">
                Interests{" "}
                <span className="text-[var(--ink-soft)]">(press Enter to add)</span>
              </label>
              <div className="rounded-3xl border-[2px] border-[var(--ink)] bg-[var(--paper)] px-3 py-3">
                {interests.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {interests.map((interest, index) => (
                      <span
                        key={`${interest}-${index}`}
                        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--bg)] px-3.5 py-1 text-sm text-[var(--ink)]"
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
                  id="interest-input"
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={onInterestKeyDown}
                  placeholder="Type an interest and press Enter"
                  className="w-full border-0 bg-transparent px-1 py-1 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-[var(--ink-muted)]">
                  Phone number
                </span>
                <input
                  type="tel"
                  required
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+44 7..."
                  className={inputCls}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-[var(--ink-muted)]">
                  Instagram{" "}
                  <span className="text-[var(--ink-soft)]">(optional)</span>
                </span>
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="your_handle"
                  className={inputCls}
                />
              </label>
            </div>

            {error && (
              <p className="text-sm text-[var(--danger)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 text-base transition-colors"
            >
              {submitting ? "One sec…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={() => {
                void signOut();
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="text-center text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              Sign out and use another email
            </button>
          </form>
        )}
      </SketchCard>
    </div>
  );
}
