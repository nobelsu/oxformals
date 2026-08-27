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
import { ROLE_OPTIONS } from "@/lib/data/roles";

type Step = "email" | "code" | "profile" | "password" | "set-password";
const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];
const ADMIN_EMAIL = "admin@ox.ac.uk";

/** Playful card headings; the final word gets the rose highlighter. */
const DINNER_GREETINGS: ReadonlyArray<{ lead: string; word: string }> = [
  { lead: "Let's get you to", word: "dinner" },
  { lead: "Save room for", word: "seconds" },
  { lead: "Your seat at", word: "hall" },
  { lead: "Time to pass the", word: "port" },
  { lead: "Find your next", word: "formal" },
  { lead: "Go on, grab a", word: "gown" },
];

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isOxfordEmail(email: string): boolean {
  return email.endsWith("@ox.ac.uk") || email.endsWith("@oxford.said.edu") || email.endsWith("@said.ox.ac.uk") || email.endsWith("@said.oxford.edu");
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
      <mark className="rounded bg-[var(--accent-wash)]/25 px-0.5 text-current">
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

function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-3 my-auto flex h-6 items-center text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
    >
      {visible ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M3.98 8.223A10.477 10.477 0 0 0 2.036 11.68a1 1 0 0 0 0 .64C3.423 16.49 7.36 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 0 1 0 .64 10.525 10.525 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M2.036 12.322a1 1 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 0 1 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
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
    signInWithPassword,
    hasPassword,
    setPassword,
    completeSignup,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPasswordValue] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordDone, setPasswordDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [greetingIdx, setGreetingIdx] = useState(0);
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

  // Pick a random greeting on mount (avoids SSR/client hydration mismatch).
  useEffect(() => {
    setGreetingIdx(Math.floor(Math.random() * DINNER_GREETINGS.length));
  }, []);

  const greeting = DINNER_GREETINGS[greetingIdx];

  useEffect(() => {
    if (status !== "ready" || !isAuthenticated) return;
    // Offer optional password setup once, when the user has none yet.
    if (hasPassword === false && !passwordDone) {
      setStep("set-password");
      return;
    }
    // Wait until we know whether a password exists before redirecting.
    if (hasPassword === undefined && !passwordDone) return;
    router.replace(nextPath);
  }, [status, isAuthenticated, hasPassword, passwordDone, nextPath, router]);

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
      await requestCode(normalized);
      setEmail(normalized);
      setStep("code");
      setCode("");
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

  async function onPasswordSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeEmail(email);
    if (!isOxfordEmail(normalized)) {
      setError("Use your Oxford email address ending in @ox.ac.uk.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setSubmitting(true);
    try {
      await signInWithPassword(normalized, password);
      setEmail(normalized);
      // Redirect handled by the auth effect once the session hydrates.
    } catch {
      setError("Incorrect email or password. Try again, or use an email code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await setPassword(password);
      setPasswordValue("");
      setPasswordConfirm("");
      setPasswordDone(true);
      router.replace(nextPath);
    } catch {
      setError("Could not set your password — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function onSkipPassword() {
    setPasswordValue("");
    setPasswordConfirm("");
    setPasswordDone(true);
    router.replace(nextPath);
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
    "w-full rounded-xl border-[2px] border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2.5 text-base transition-shadow focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-wash)]";
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

  const stepEyebrow =
    step === "email"
      ? "Sign in"
      : step === "code"
        ? "Check your inbox"
        : step === "password"
          ? "Sign in"
          : step === "set-password"
            ? "One last thing"
            : "Your details";

  return (
    <div
      data-landing-theme="navy"
      className="flex min-h-[calc(100dvh-var(--app-nav-height))] items-center justify-center bg-[var(--bg)] px-6 py-12 text-[var(--ink)]"
    >
      <div className={`w-full ${step === "profile" ? "max-w-lg" : "max-w-sm"}`}>
        <SketchCard className="p-8" seed={3}>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
            {stepEyebrow}
          </p>
          <h1 className="mb-6 mt-2 font-display text-3xl leading-tight text-[var(--ink)]">
            {greeting.lead}{" "}
            <span className="relative inline-block">
              {/* Light mode: filled highlighter behind the word. */}
              <span
                aria-hidden
                className="absolute inset-x-[-0.08em] bottom-[0.05em] block h-[0.5em] -rotate-1 rounded-[0.2em] bg-[var(--accent-wash)] dark:hidden"
              />
              {/* Dark mode: an accent underline instead (highlight is unreadable on dark). */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-[0.02em] hidden h-[3px] -rotate-1 rounded-full bg-[var(--accent)] dark:block"
              />
              <span className="relative text-[var(--accent-wash-ink)] dark:text-[var(--ink)]">
                {greeting.word}
              </span>
            </span>
            .
          </h1>

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
              className="mt-2 w-full rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--accent-ink)] py-3 text-base transition-colors"
            >
              {submitting ? "Sending…" : "Send code"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]" />
              <span className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                or
              </span>
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]" />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setPasswordValue("");
                setStep("password");
              }}
              className="w-full cursor-pointer rounded-full border-[2px] border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
            >
              Sign in with a password
            </button>
          </form>
        ) : step === "code" ? (
          <form onSubmit={onCodeSubmit} className="flex flex-col gap-4">
            <p className="text-[var(--ink-muted)] leading-relaxed">
              {normalizeEmail(email) === ADMIN_EMAIL ? (
                <>
                  Enter the 6-digit admin sign-in code sent to the admin
                  contact email.
                </>
              ) : (
                <>
                  Enter the 6-digit code we sent to{" "}
                  <span className="text-[var(--ink)] font-medium">{email}</span>
                  .
                </>
              )}
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
              className="mt-2 w-full cursor-pointer rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--accent-ink)] py-3 text-base transition-colors"
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
        ) : step === "password" ? (
          <form onSubmit={onPasswordSignIn} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">
                Oxford email
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

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Your password"
                  className={`${inputCls} pr-12`}
                />
                {password.length > 0 && (
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                )}
              </div>
            </label>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full cursor-pointer rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--accent-ink)] py-3 text-base transition-colors"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]" />
              <span className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                or
              </span>
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]" />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setPasswordValue("");
                setStep("email");
              }}
              className="w-full cursor-pointer rounded-full border-[2px] border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
            >
              Sign in with an email code
            </button>
          </form>
        ) : step === "set-password" ? (
          <form onSubmit={onSetPassword} className="flex flex-col gap-4">
            <p className="text-[var(--ink-muted)] leading-relaxed">
              Set a password for faster sign in.
            </p>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">
                Set password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputCls} pr-12`}
                />
                {password.length > 0 && (
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                )}
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">
                Confirm password
              </span>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className={`${inputCls} pr-12`}
                />
                {passwordConfirm.length > 0 && (
                  <PasswordToggle
                    visible={showPasswordConfirm}
                    onToggle={() => setShowPasswordConfirm((v) => !v)}
                  />
                )}
              </div>
            </label>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full cursor-pointer rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--accent-ink)] py-3 text-base transition-colors"
            >
              {submitting ? "Saving…" : "Set password"}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={onSkipPassword}
              className="text-center text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              Skip for now
            </button>
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
                Interests
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
                <div className="flex items-center gap-2">
                  <input
                    id="interest-input"
                    type="text"
                    enterKeyHint="done"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={onInterestKeyDown}
                    placeholder="Type an interest…"
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addInterest(interestInput);
                      setInterestInput("");
                    }}
                    disabled={!normalizeInterest(interestInput)}
                    aria-label="Add interest"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
                    </svg>
                  </button>
                </div>
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
              className="mt-2 w-full rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--accent-ink)] py-3 text-base transition-colors"
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
    </div>
  );
}
