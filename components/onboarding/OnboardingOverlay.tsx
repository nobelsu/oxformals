"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { SketchCard } from "@/components/ui/SketchCard";

const HOUSE_RULES = [
  "Be respectful and courteous to everyone you interact with.",
  "Only use your real Oxford email — no impersonation.",
  "Honour confirmed swaps. Don't ghost after accepting a request.",
  "Don't create fake or duplicate listings.",
  "Reach out to your swap partner promptly after a match is confirmed.",
  "Report any issues or inappropriate behaviour to the team.",
];

function WelcomeSlide() {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <svg
        viewBox="0 0 80 80"
        className="w-20 h-20 text-[var(--accent)]"
        fill="none"
        aria-hidden
      >
        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
        <path
          d="M30 52 C30 36, 40 24, 40 24 C40 24, 50 36, 50 52"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M36 52 C36 44, 40 38, 40 38 C40 38, 44 44, 44 52"
          fill="currentColor"
          opacity="0.25"
        />
        <line x1="40" y1="52" x2="40" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="35" y1="60" x2="45" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>
        <h2 className="font-display text-4xl sm:text-5xl uppercase tracking-wide">
          Welcome to Oxformals
        </h2>
        <p className="mt-4 text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed max-w-sm mx-auto">
          The easiest way to experience formals at colleges across Oxford.
          Let&apos;s show you around.
        </p>
      </div>
    </div>
  );
}

function BrowseSlide() {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <svg
        viewBox="0 0 80 80"
        className="w-20 h-20 text-[var(--accent)]"
        fill="none"
        aria-hidden
      >
        <rect x="12" y="18" width="24" height="30" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <rect x="44" y="18" width="24" height="30" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <rect x="12" y="18" width="24" height="30" rx="4" fill="currentColor" opacity="0.12" />
        <line x1="18" y1="28" x2="30" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="34" x2="28" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="28" x2="62" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="34" x2="60" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 58 L40 52 L52 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-wide">
          Browse &amp; List
        </h2>
        <p className="mt-4 text-[var(--ink-muted)] text-base leading-relaxed max-w-sm mx-auto">
          Browse open formals at other colleges, or list your own formal
          and invite others to join your group.
        </p>
      </div>
    </div>
  );
}

function SwapSlide() {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <svg
        viewBox="0 0 80 80"
        className="w-20 h-20 text-[var(--accent)]"
        fill="none"
        aria-hidden
      >
        <path
          d="M20 32 L60 32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M52 24 L60 32 L52 40"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M60 48 L20 48"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M28 40 L20 48 L28 56"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-wide">
          Request &amp; Swap
        </h2>
        <p className="mt-4 text-[var(--ink-muted)] text-base leading-relaxed max-w-sm mx-auto">
          Send a swap request by offering one of your formals in return.
          Once accepted, you&apos;ll get each other&apos;s contact details
          to sort the rest.
        </p>
      </div>
    </div>
  );
}

function RulesSlide({
  agreed,
  onToggle,
}: {
  agreed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <svg
        viewBox="0 0 80 80"
        className="w-16 h-16 text-[var(--accent)]"
        fill="none"
        aria-hidden
      >
        <rect x="20" y="10" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <rect x="20" y="10" width="40" height="52" rx="4" fill="currentColor" opacity="0.10" />
        <line x1="28" y1="24" x2="52" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="32" x2="48" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="40" x2="50" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="48" x2="44" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M34 66 L40 72 L52 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-wide">
          House Rules
        </h2>
        <p className="mt-2 text-[var(--ink-muted)] text-sm leading-relaxed max-w-sm mx-auto">
          Please read and agree before continuing.
        </p>
      </div>
      <ul className="text-left w-full max-w-sm space-y-2.5">
        {HOUSE_RULES.map((rule, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-[var(--ink)] leading-relaxed">
            <span className="mt-0.5 shrink-0 text-[var(--accent)]">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <text x="8" y="11.5" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold">
                  {i + 1}
                </text>
              </svg>
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <label className="mt-2 flex items-center gap-3 cursor-pointer select-none group">
        <span className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={agreed}
            onChange={onToggle}
            className="peer sr-only"
          />
          <span className="flex h-6 w-6 items-center justify-center rounded-md border-[2px] border-[var(--ink)] bg-[var(--paper)] transition-colors peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/50">
            {agreed && (
              <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-[var(--accent-ink)]">
                <path
                  d="M2.5 6 L5 8.5 L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
          </span>
        </span>
        <span className="text-sm text-[var(--ink)]">
          I agree to the house rules
        </span>
      </label>
    </div>
  );
}

const TOTAL_SLIDES = 4;

export function OnboardingOverlay() {
  const { needsRulesAgreement, agreeToRules } = useAuth();
  const [slide, setSlide] = useState(0);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!needsRulesAgreement) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [needsRulesAgreement]);

  const isLastSlide = slide === TOTAL_SLIDES - 1;

  const handleNext = useCallback(async () => {
    if (!isLastSlide) {
      setSlide((s) => s + 1);
      return;
    }
    if (!rulesAgreed) return;
    setSubmitting(true);
    try {
      await agreeToRules();
    } finally {
      setSubmitting(false);
    }
  }, [isLastSlide, rulesAgreed, agreeToRules]);

  const handleBack = useCallback(() => {
    setSlide((s) => Math.max(0, s - 1));
  }, []);

  if (!needsRulesAgreement) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm" />
      <SketchCard
        seed={7}
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 sm:p-8"
      >
        <div className="min-h-[360px] flex flex-col">
          <div className="flex-1 flex items-center justify-center py-4">
            {slide === 0 && <WelcomeSlide />}
            {slide === 1 && <BrowseSlide />}
            {slide === 2 && <SwapSlide />}
            {slide === 3 && (
              <RulesSlide
                agreed={rulesAgreed}
                onToggle={() => setRulesAgreed((v) => !v)}
              />
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex justify-center gap-2">
              {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === slide
                      ? "w-6 bg-[var(--accent)]"
                      : "w-2 bg-[var(--ink-soft)]/40"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {slide > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 rounded-full border-[2px] border-[var(--ink)] px-4 py-2.5 text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors text-sm"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={isLastSlide && (!rulesAgreed || submitting)}
                className="flex-1 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-ink)] px-4 py-2.5 transition-colors text-sm"
              >
                {submitting
                  ? "Saving\u2026"
                  : isLastSlide
                    ? "Continue"
                    : "Next"}
              </button>
            </div>
          </div>
        </div>
      </SketchCard>
    </div>
  );
}
