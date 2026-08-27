"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { SketchCard } from "@/components/ui/SketchCard";
import { PencilArrow } from "./PencilArrow";
import { RulesSlide } from "./RulesSlide";

type CoachId = "request" | "activity" | "me";

type CoachStep = {
  id: CoachId;
  label: string;
  selector: string;
  fallbackSelector?: string;
  hintWhenFallback: string;
};

const COACH_STEPS: readonly CoachStep[] = [
  {
    id: "request",
    label: "Ask to join",
    selector: '[data-onboarding="request"]',
    hintWhenFallback: "",
  },
  {
    id: "activity",
    label: "List yours",
    selector: '[data-onboarding="activity"]',
    fallbackSelector: '[data-onboarding="menu"]',
    hintWhenFallback: "in the menu",
  },
  {
    id: "me",
    label: "Your profile",
    selector: '[data-onboarding="me"], [aria-label="Your profile"]',
    fallbackSelector: '[data-onboarding="menu"]',
    hintWhenFallback: "in the menu",
  },
];

type Target = {
  rect: DOMRect;
  usedFallback: boolean;
};

type Hole = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function isLaidOut(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function queryLaidOut(selector: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  for (const node of nodes) {
    if (isLaidOut(node)) return node;
  }
  return null;
}

function readTarget(step: CoachStep): Target | null {
  const primary = queryLaidOut(step.selector);
  if (primary) {
    return { rect: primary.getBoundingClientRect(), usedFallback: false };
  }
  if (step.fallbackSelector) {
    const fallback = queryLaidOut(step.fallbackSelector);
    if (fallback) {
      return { rect: fallback.getBoundingClientRect(), usedFallback: true };
    }
  }
  return null;
}

function scrollTargetIntoView(step: CoachStep) {
  const el =
    queryLaidOut(step.selector) ??
    (step.fallbackSelector ? queryLaidOut(step.fallbackSelector) : null);
  el?.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function closestEdge(rect: DOMRect, from: { x: number; y: number }): { x: number; y: number } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const pad = 4;
  if (Math.abs(from.x - cx) > Math.abs(from.y - cy)) {
    return {
      x: from.x < cx ? rect.left - pad : rect.right + pad,
      y: cy,
    };
  }
  return {
    x: cx,
    y: from.y < cy ? rect.top - pad : rect.bottom + pad,
  };
}

function labelAnchor(rect: DOMRect): { x: number; y: number } {
  const below = rect.top < 120;
  if (below) {
    return {
      x: Math.min(Math.max(rect.left + rect.width / 2, 96), window.innerWidth - 96),
      y: Math.min(rect.bottom + 88, window.innerHeight - 140),
    };
  }
  return {
    x: Math.max(96, rect.left - 8),
    y: Math.max(72, rect.top - 36),
  };
}

function SpotlightDim({ hole }: { hole: Hole }) {
  const dim = "pointer-events-none absolute bg-[#1a1810]/82";
  const radius = Math.min(hole.height / 2, 14);

  return (
    <>
      <div
        className={dim}
        style={{ top: 0, left: 0, right: 0, height: hole.top }}
      />
      <div
        className={dim}
        style={{
          top: hole.top,
          left: 0,
          width: hole.left,
          height: hole.height,
        }}
      />
      <div
        className={dim}
        style={{
          top: hole.top,
          left: hole.left + hole.width,
          right: 0,
          height: hole.height,
        }}
      />
      <div
        className={dim}
        style={{
          top: hole.top + hole.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <div
        className="pointer-events-none absolute border-[2.5px] border-[var(--accent)]"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: radius,
        }}
      />
    </>
  );
}

export function OnboardingOverlay() {
  const { needsRulesAgreement, agreeToRules } = useAuth();
  const [hasRequestCta, setHasRequestCta] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);

  const coachSteps = useMemo(
    () =>
      hasRequestCta
        ? COACH_STEPS
        : COACH_STEPS.filter((step) => step.id !== "request"),
    [hasRequestCta],
  );
  const totalSteps = coachSteps.length + 1;
  const currentIndex = Math.min(stepIndex, coachSteps.length);
  const isRules = currentIndex >= coachSteps.length;
  const coach = isRules ? null : (coachSteps[currentIndex] ?? null);

  useEffect(() => {
    if (!needsRulesAgreement) return;
    function scanCta() {
      const found = queryLaidOut('[data-onboarding="request"]') !== null;
      setHasRequestCta((prev) => (stepIndex > 0 ? prev : found));
    }
    const observer = new MutationObserver(scanCta);
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(scanCta, 0);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [needsRulesAgreement, stepIndex]);

  useEffect(() => {
    if (!needsRulesAgreement || !coach) return;
    const step = coach;
    scrollTargetIntoView(step);
    function measure() {
      setTarget(readTarget(step));
    }
    const delays = [0, 80, 320, 700];
    const timers = delays.map((ms) => window.setTimeout(measure, ms));
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      for (const id of timers) window.clearTimeout(id);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [needsRulesAgreement, coach]);

  const goTo = useCallback(
    (next: number) => {
      setStepIndex(Math.max(0, Math.min(totalSteps - 1, next)));
    },
    [totalSteps],
  );

  const handleNext = useCallback(async () => {
    if (!isRules) {
      goTo(currentIndex + 1);
      return;
    }
    if (!rulesAgreed) return;
    setSubmitting(true);
    try {
      await agreeToRules();
    } finally {
      setSubmitting(false);
    }
  }, [agreeToRules, currentIndex, goTo, isRules, rulesAgreed]);

  const handleBack = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  useEffect(() => {
    if (!needsRulesAgreement) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (!isRules) goTo(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, goTo, handleBack, isRules, needsRulesAgreement]);

  if (!needsRulesAgreement) return null;

  const pad = 10;
  const spotlight = target
    ? {
        top: Math.max(0, target.rect.top - pad),
        left: Math.max(0, target.rect.left - pad),
        width: target.rect.width + pad * 2,
        height: target.rect.height + pad * 2,
      }
    : null;
  const labelPos = target ? labelAnchor(target.rect) : null;
  const arrowTo =
    target && labelPos ? closestEdge(target.rect, labelPos) : null;
  const hint =
    coach && target?.usedFallback ? coach.hintWhenFallback : "";

  const stepNames = [
    ...coachSteps.map((step) => step.label),
    "House rules",
  ];

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0" aria-hidden />

      {isRules ? (
        <div className="absolute inset-0 bg-[#1a1810]/82 backdrop-blur-sm" />
      ) : spotlight ? (
        <SpotlightDim hole={spotlight} />
      ) : (
        <div className="absolute inset-0 bg-[#1a1810]/82" />
      )}

      {!isRules && labelPos && arrowTo ? (
        <PencilArrow
          from={{ x: labelPos.x, y: labelPos.y + 18 }}
          to={arrowTo}
          seed={currentIndex + 3}
        />
      ) : null}

      {!isRules && labelPos ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: labelPos.x, top: labelPos.y }}
        >
          <p className="font-display text-3xl uppercase tracking-wide text-[var(--accent)] drop-shadow-[0_1px_0_var(--bg)]">
            {coach?.label}
          </p>
          {hint ? (
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ink)]">
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}

      {isRules ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <SketchCard
            seed={7}
            className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-6"
          >
            <RulesSlide
              agreed={rulesAgreed}
              onToggle={() => setRulesAgreed((v) => !v)}
            />
            <TourControls
              stepIndex={currentIndex}
              totalSteps={totalSteps}
              stepNames={stepNames}
              isRules
              rulesAgreed={rulesAgreed}
              submitting={submitting}
              onBack={handleBack}
              onNext={() => void handleNext()}
              onJump={goTo}
            />
          </SketchCard>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border-[2px] border-[var(--ink)]/20 bg-[var(--paper)]/92 px-4 py-3 backdrop-blur-sm">
            <TourControls
              stepIndex={currentIndex}
              totalSteps={totalSteps}
              stepNames={stepNames}
              isRules={false}
              rulesAgreed={rulesAgreed}
              submitting={submitting}
              onBack={handleBack}
              onNext={() => void handleNext()}
              onJump={goTo}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TourControls({
  stepIndex,
  totalSteps,
  stepNames,
  isRules,
  rulesAgreed,
  submitting,
  onBack,
  onNext,
  onJump,
}: {
  stepIndex: number;
  totalSteps: number;
  stepNames: string[];
  isRules: boolean;
  rulesAgreed: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onJump: (next: number) => void;
}) {
  return (
    <div className={`flex flex-col gap-3 ${isRules ? "mt-4" : ""}`}>
      <div className="flex justify-center gap-2" aria-label="Onboarding steps">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={stepNames[i] ?? i}
            type="button"
            aria-label={stepNames[i]}
            aria-current={i === stepIndex ? "step" : undefined}
            onClick={() => onJump(i)}
            className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              i === stepIndex
                ? "w-6 bg-[var(--accent)]"
                : "w-2 bg-[var(--ink-soft)]/40 hover:bg-[var(--ink-soft)]/70"
            }`}
          />
        ))}
      </div>
      <div className="flex gap-3">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full border-[2px] border-[var(--ink)] px-4 py-2.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] active:scale-[0.98] motion-reduce:active:scale-100"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={onNext}
          disabled={isRules && (!rulesAgreed || submitting)}
          className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] motion-reduce:active:scale-100"
        >
          {submitting ? "Saving\u2026" : isRules ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}
