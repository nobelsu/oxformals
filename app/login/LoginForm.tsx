"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { SketchCard } from "@/components/ui/SketchCard";

type Step = "email" | "profile";

function parseInterests(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function LoginForm() {
  const { status, isAuthenticated, signIn, completeSignup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
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
      const result = await signIn(trimmed);
      if (result.status === "signed-in") {
        router.replace(nextPath);
      } else {
        setEmail(result.email);
        setStep("profile");
      }
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
        email,
        name: name.trim(),
        college: college.trim(),
        year: year.trim(),
        role: role.trim(),
        interests: parseInterests(interests),
      });
      router.replace(nextPath);
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
              {submitting ? "Sending…" : "Send magic link"}
            </button>

            <p className="text-center text-xs text-[var(--ink-soft)]">
              Let&apos;s get you to dinner.
            </p>
          </form>
        ) : (
          <form onSubmit={onProfileSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-[var(--ink-muted)]">
              New here? Just a few details so we can seat you.
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
              onClick={() => setStep("email")}
              className="text-center text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              Use a different email
            </button>
          </form>
        )}
      </SketchCard>
    </div>
  );
}
