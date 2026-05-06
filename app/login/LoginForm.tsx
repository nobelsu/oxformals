"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { SketchCard } from "@/components/ui/SketchCard";

type Step = "email" | "code" | "profile";

function parseInterests(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatVerifyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("could not verify") || lower.includes("invalid")) {
    return "That code doesn’t match or has expired. Try again or request a new code.";
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
  const [interests, setInterests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("That doesn't look like an email.");
      return;
    }
    setSubmitting(true);
    try {
      await requestCode(trimmed);
      setEmail(trimmed);
      setStep("code");
      setCode("");
    } catch {
      setError("Could not send the code — check your Convex and Resend setup.");
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
      setError("Could not resend — check your Convex and Resend setup.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !college.trim() || !year.trim() || !role.trim()) {
      setError("Add name, college, year, and role — it only takes a moment.");
      return;
    }
    setSubmitting(true);
    try {
      await completeSignup({
        email: email.trim(),
        name: name.trim(),
        college: college.trim(),
        year: year.trim(),
        role: role.trim(),
        interests: parseInterests(interests),
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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 py-16 bg-[var(--bg)]">
      <SketchCard className="w-full max-w-sm p-8" seed={3}>
        <header className="mb-6 text-center">
          <h1 className="font-display text-5xl tracking-wide uppercase">
            FormalSwap
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
                placeholder="you@ox.ac.uk"
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
              className="mt-2 w-full rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 text-base transition-colors"
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>

            <button
              type="button"
              disabled={submitting}
              className="w-full rounded-full border-[2px] border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-2.5 transition-colors disabled:opacity-60 text-sm"
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
              <input
                type="text"
                required
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Balliol"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Year</span>
              <input
                type="text"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2nd year"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Role</span>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Undergraduate"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-[var(--ink-muted)]">
                Interests{" "}
                <span className="text-[var(--ink-soft)]">
                  (comma separated)
                </span>
              </span>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="rowing, punting, drawing"
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
