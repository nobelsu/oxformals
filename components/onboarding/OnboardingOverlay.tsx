"use client";

import { SpoonIcon } from "@/components/credits/CreditsChip";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { placeCallout, type Box } from "@/lib/ui/calloutPlacement";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import { COLLEGE_FILTER_HIGHLIGHTS, OXFORD_COLLEGES } from "@/lib/data/colleges";

type SlideId = "ways" | "credit" | "friends" | "colleges" | "done";
type PointerId = "browse" | "list" | "bell";

type PointerStep = {
  kind: "pointer";
  id: PointerId;
  title: string;
  line: string;
  selector: string;
  fallbackSelector?: string;
  fallbackLine?: string;
};
type SlideStep = { kind: "slide"; id: SlideId };
type Step = PointerStep | SlideStep;

const POINTERS: readonly PointerStep[] = [
  {
    kind: "pointer",
    id: "browse",
    title: "Find a seat",
    line: "Every open formal.",
    selector: '[data-onboarding="browse"]',
    fallbackSelector: '[data-onboarding="menu"]',
    fallbackLine: "In the menu.",
  },
  {
    kind: "pointer",
    id: "list",
    title: "Host yours",
    line: "Guests can pay in spoons.",
    selector: '[data-onboarding="list"]',
  },
  {
    kind: "pointer",
    id: "bell",
    title: "Your bell",
    line: "Requests and invites.",
    selector: '[data-onboarding="bell"]',
  },
];

const pointer = (id: PointerId) => POINTERS.find((p) => p.id === id)!;

// Slides explain the idea; pointers show where things are. One flow.
const FLOW: readonly Step[] = [
  { kind: "slide", id: "ways" },
  { kind: "slide", id: "credit" },
  pointer("browse"),
  pointer("list"),
  { kind: "slide", id: "friends" },
  pointer("bell"),
  { kind: "slide", id: "colleges" },
  { kind: "slide", id: "done" },
];

const CALLOUT_WIDTH = 264;
const HOLE_PAD = 8;

type Target = { rect: DOMRect; usedFallback: boolean };

function isLaidOut(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function queryLaidOut(selector: string): HTMLElement | null {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    if (isLaidOut(node)) return node;
  }
  return null;
}

function findTarget(step: PointerStep): { el: HTMLElement; usedFallback: boolean } | null {
  const primary = queryLaidOut(step.selector);
  if (primary) return { el: primary, usedFallback: false };
  const fallback = step.fallbackSelector ? queryLaidOut(step.fallbackSelector) : null;
  return fallback ? { el: fallback, usedFallback: true } : null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Enter already activates a focused button or link; don't do it twice. */
function activatesOnEnter(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["BUTTON", "A"].includes(target.tagName);
}

export function OnboardingOverlay() {
  const { needsRulesAgreement } = useAuth();
  if (!needsRulesAgreement) return null;
  return <OnboardingFlow />;
}

function OnboardingFlow() {
  const { user, agreeToRules } = useAuth();
  const router = useRouter();
  // Pointers whose target is on screen; fixed once the user moves past step one.
  const [foundPointers, setFoundPointers] = useState<readonly PointerId[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  // Targets (the feed's "List a formal", the bell) appear once their data
  // loads, so wait for all of them (or a short cap) before showing step one;
  // otherwise the progress dots change under the user.
  const [settled, setSettled] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(
    () =>
      FLOW.filter((step) => step.kind === "slide" || foundPointers.includes(step.id)),
    [foundPointers],
  );
  const index = Math.min(stepIndex, steps.length - 1);
  const step = steps[index];

  useEffect(() => {
    if (stepIndex > 0) return;
    function scan() {
      const found = POINTERS.filter((p) => findTarget(p) !== null).map((p) => p.id);
      setFoundPointers((prev) =>
        prev.length === found.length && prev.every((id, i) => id === found[i])
          ? prev
          : found,
      );
      if (found.length === POINTERS.length) setSettled(true);
    }
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    const first = window.setTimeout(scan, 0);
    const cap = window.setTimeout(() => setSettled(true), 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(first);
      window.clearTimeout(cap);
    };
  }, [stepIndex]);

  const goTo = useCallback(
    (next: number) => {
      setError(null);
      setStepIndex(Math.max(0, Math.min(steps.length - 1, next)));
    },
    [steps.length],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  const finish = useCallback(async () => {
    setFinishing(true);
    setError(null);
    try {
      await agreeToRules();
      router.push(BROWSE_ROUTE);
    } catch {
      setError("Couldn't save that. Try again.");
      setFinishing(false);
    }
  }, [agreeToRules, router]);

  // The colleges slide saves before moving on; it registers its handler here.
  const advanceRef = useRef<(() => void) | null>(null);
  const primary = useCallback(() => {
    if (step?.kind === "slide" && step.id === "done") {
      if (!finishing) void finish();
    } else if (advanceRef.current) {
      advanceRef.current();
    } else {
      next();
    }
  }, [finish, finishing, next, step]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // The tour has to be finished.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (isTextField(event.target)) return;
      if (event.key === "Enter" && activatesOnEnter(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        primary();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [back, primary]);

  // Keep keyboard focus inside the tour: move it to the primary button.
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!settled) return;
    primaryRef.current?.focus({ preventScroll: true });
  }, [settled, index]);

  if (!settled || !step) return null;

  const dots = <Dots index={index} total={steps.length} />;

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {step.kind === "pointer" ? (
        <PointerView
          key={step.id}
          step={step}
          dots={dots}
          canGoBack={index > 0}
          onBack={back}
          onNext={next}
          primaryRef={primaryRef}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[color-mix(in_srgb,#0f0e0a_58%,transparent)]" />
          <SlideCard>
            {dots}
            {step.id === "ways" ? (
              <WaysSlide onNext={next} primaryRef={primaryRef} />
            ) : step.id === "credit" ? (
              <TextSlide
                coin
                title="You've got a spoon"
                line="1 spoon = 1 seat. Host to earn more."
                onBack={back}
                onNext={next}
                primaryRef={primaryRef}
              />
            ) : step.id === "friends" ? (
              <TextSlide
                title="Go with friends"
                line="Follow each other, then book together."
                onBack={back}
                onNext={next}
                primaryRef={primaryRef}
              />
            ) : step.id === "colleges" ? (
              <CollegesSlide
                ownCollege={user?.college}
                onNext={next}
                advanceRef={advanceRef}
                primaryRef={primaryRef}
              />
            ) : (
              <DoneSlide
                finishing={finishing}
                error={error}
                onFinish={() => void finish()}
                primaryRef={primaryRef}
              />
            )}
          </SlideCard>
        </>
      )}
    </div>
  );
}

function Dots({ index, total }: { index: number; total: number }) {
  return (
    <div
      className="flex justify-center gap-[5px]"
      role="img"
      aria-label={`Step ${index + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
            i === index
              ? "w-[18px] bg-[var(--accent)]"
              : "w-1.5 bg-[color-mix(in_srgb,var(--ink)_25%,transparent)]"
          }`}
        />
      ))}
    </div>
  );
}

function SlideCard({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div className="onboarding-card-in w-full max-w-[420px] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[22px] border-2 border-[var(--ink)] bg-[var(--paper)] px-4 pb-3.5 pt-[18px] text-[var(--ink)] sm:px-6 sm:pb-5 sm:pt-6">
        {children}
      </div>
    </div>
  );
}

function SlideTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      id="onboarding-title"
      className={`text-center font-display text-[26px] uppercase leading-none ${className}`}
    >
      {children}
    </h2>
  );
}

function SlideLine({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-center text-[13px] leading-snug text-[var(--ink-muted)] sm:text-sm">
      {children}
    </p>
  );
}

const btnBase =
  "rounded-full border-2 px-3 py-2.5 text-[13px] font-bold transition-colors active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary = `${btnBase} flex-[2] border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]`;
const btnSecondary = `${btnBase} flex-1 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]`;

type PrimaryRef = RefObject<HTMLButtonElement | null>;

function Buttons({
  backLabel,
  onBack,
  nextLabel = "Next",
  onNext,
  primaryRef,
  disabled,
}: {
  backLabel?: string;
  onBack?: () => void;
  nextLabel?: string;
  onNext: () => void;
  primaryRef: PrimaryRef;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3.5 flex gap-2">
      {onBack ? (
        <button type="button" onClick={onBack} className={btnSecondary}>
          {backLabel ?? "Back"}
        </button>
      ) : null}
      <button
        ref={primaryRef}
        type="button"
        onClick={onNext}
        disabled={disabled}
        className={btnPrimary}
      >
        {nextLabel}
      </button>
    </div>
  );
}

const WAYS = [
  { title: "Swap", line: "Trade seats" },
  { title: "Pay", line: "Pay the host" },
  { title: "Spoon", line: "Use a spoon" },
] as const;

function WaysSlide({ onNext, primaryRef }: { onNext: () => void; primaryRef: PrimaryRef }) {
  return (
    <>
      <SlideTitle className="mt-3">A seat at any formal</SlideTitle>
      <div className="mt-3.5 grid grid-cols-3 gap-1.5">
        {WAYS.map((way) => (
          <div
            key={way.title}
            className="rounded-[14px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] px-1 py-2.5 text-center text-[11px] text-[var(--ink-muted)] sm:text-xs"
          >
            <b className="block font-display text-[17px] font-normal uppercase text-[var(--ink)]">
              {way.title}
            </b>
            {way.line}
          </div>
        ))}
      </div>
      <Buttons onNext={onNext} primaryRef={primaryRef} />
    </>
  );
}

function TextSlide({
  coin,
  title,
  line,
  onBack,
  onNext,
  primaryRef,
}: {
  coin?: boolean;
  title: string;
  line: string;
  onBack: () => void;
  onNext: () => void;
  primaryRef: PrimaryRef;
}) {
  return (
    <>
      {coin ? (
        <div
          aria-hidden
          className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--ink)] text-[var(--accent)]"
        >
          <SpoonIcon className="h-7 w-7" />
        </div>
      ) : null}
      <SlideTitle className={coin ? "mt-2.5" : "mt-3"}>{title}</SlideTitle>
      <SlideLine>{line}</SlideLine>
      <Buttons onBack={onBack} onNext={onNext} primaryRef={primaryRef} />
    </>
  );
}

function CollegesSlide({
  ownCollege,
  onNext,
  advanceRef,
  primaryRef,
}: {
  ownCollege?: string;
  onNext: () => void;
  advanceRef: RefObject<(() => void) | null>;
  primaryRef: PrimaryRef;
}) {
  const saved = useQuery(api.users.myWishlist, {});
  const save = useMutation(api.users.saveWishlistColleges);
  const [picked, setPicked] = useState<readonly string[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preselect what they already want once it loads.
  const selected = useMemo(() => picked ?? saved ?? [], [picked, saved]);

  const colleges = useMemo(() => {
    const all = (OXFORD_COLLEGES as readonly string[]).filter((c) => c !== ownCollege);
    if (expanded) {
      const q = search.trim().toLowerCase();
      return q ? all.filter((c) => c.toLowerCase().includes(q)) : all;
    }
    const short = COLLEGE_FILTER_HIGHLIGHTS.filter((c) => c !== ownCollege) as string[];
    const extra = selected.filter((c) => !short.includes(c));
    return [...short, ...extra];
  }, [expanded, ownCollege, search, selected]);

  const toggle = (college: string) => {
    setPicked(
      selected.includes(college)
        ? selected.filter((c) => c !== college)
        : [...selected, college],
    );
  };

  const saveAndNext = useCallback(async () => {
    if (saving) return;
    const before = saved ?? [];
    const changed =
      picked !== null &&
      (picked.length !== before.length || picked.some((c) => !before.includes(c)));
    if (!changed) {
      onNext();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await save({ colleges: [...picked] });
      onNext();
    } catch {
      setError("Couldn't save. Try again, or skip.");
    } finally {
      setSaving(false);
    }
  }, [onNext, picked, save, saved, saving]);

  useEffect(() => {
    advanceRef.current = () => void saveAndNext();
    return () => {
      advanceRef.current = null;
    };
  }, [advanceRef, saveAndNext]);

  const chip =
    "rounded-full border-[1.5px] px-2.5 py-1 text-xs transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <>
      <SlideTitle className="mt-3">Where do you want to go?</SlideTitle>
      {expanded ? (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search colleges"
          aria-label="Search colleges"
          autoFocus
          className="mt-3 w-full rounded-full border-[1.5px] border-[var(--ink)] bg-transparent px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
      ) : null}
      <div
        className={`mt-3 flex flex-wrap justify-center gap-1.5 ${expanded ? "max-h-[38dvh] overflow-y-auto py-0.5" : ""}`}
        role="group"
        aria-label="Colleges you want to go to"
      >
        {colleges.map((college) => {
          const on = selected.includes(college);
          return (
            <button
              key={college}
              type="button"
              aria-pressed={on}
              disabled={saved === undefined}
              onClick={() => toggle(college)}
              className={`${chip} ${
                on
                  ? "border-[var(--ink)] bg-[var(--ink)] font-bold text-[var(--bg)]"
                  : "border-[color-mix(in_srgb,var(--ink)_14%,transparent)] text-[var(--ink)] hover:border-[var(--ink)]"
              }`}
            >
              {college}
            </button>
          );
        })}
        {expanded && colleges.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">No college matches.</p>
        ) : null}
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`${chip} border-[color-mix(in_srgb,var(--ink)_14%,transparent)] text-[var(--ink-muted)] hover:border-[var(--ink)]`}
          >
            + More
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <Buttons
        backLabel="Skip"
        onBack={onNext}
        nextLabel={saving ? "Saving…" : "Next"}
        onNext={() => void saveAndNext()}
        primaryRef={primaryRef}
        disabled={saving}
      />
    </>
  );
}

function DoneSlide({
  finishing,
  error,
  onFinish,
  primaryRef,
}: {
  finishing: boolean;
  error: string | null;
  onFinish: () => void;
  primaryRef: PrimaryRef;
}) {
  const link = "underline underline-offset-2 hover:text-[var(--ink)]";
  return (
    <>
      <SlideTitle className="mt-3">You&apos;re in</SlideTitle>
      <SlideLine>Show up, or give your seat back early.</SlideLine>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <Buttons
        nextLabel={finishing ? "Saving…" : "Find a seat"}
        onNext={onFinish}
        primaryRef={primaryRef}
        disabled={finishing}
      />
      <p className="mt-2.5 text-center text-[11px] text-[var(--ink-muted)]">
        By continuing you agree to the{" "}
        <a href="/terms" target="_blank" rel="noopener" className={link}>
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" rel="noopener" className={link}>
          Privacy policy
        </a>
        .
      </p>
    </>
  );
}

function PointerView({
  step,
  dots,
  canGoBack,
  onBack,
  onNext,
  primaryRef,
}: {
  step: PointerStep;
  dots: ReactNode;
  canGoBack: boolean;
  onBack: () => void;
  onNext: () => void;
  primaryRef: PrimaryRef;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [calloutHeight, setCalloutHeight] = useState(118);
  const calloutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = findTarget(step);
    found?.el.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    function measure() {
      const hit = findTarget(step);
      setTarget(hit ? { rect: hit.el.getBoundingClientRect(), usedFallback: hit.usedFallback } : null);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    const timers = [0, 80, 320, 700].map((ms) => window.setTimeout(measure, ms));
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
  }, [step]);

  const shown = target !== null && viewport.width > 0;
  useLayoutEffect(() => {
    const el = calloutRef.current;
    if (!shown || !el) return;
    const read = () => setCalloutHeight(el.offsetHeight);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  // The callout mounts after the target is measured; focus its Next then.
  useEffect(() => {
    if (shown) primaryRef.current?.focus({ preventScroll: true });
  }, [shown, primaryRef]);

  const scrim = "bg-[color-mix(in_srgb,#0f0e0a_58%,transparent)]";
  if (!shown) {
    return <div className={`absolute inset-0 ${scrim}`} />;
  }

  const hole: Box = {
    top: target.rect.top - HOLE_PAD,
    left: target.rect.left - HOLE_PAD,
    width: target.rect.width + HOLE_PAD * 2,
    height: target.rect.height + HOLE_PAD * 2,
  };
  const place = placeCallout(
    hole,
    { width: CALLOUT_WIDTH, height: calloutHeight },
    viewport,
  );
  const line = target.usedFallback && step.fallbackLine ? step.fallbackLine : step.line;
  const below = place.side === "below";
  const motion =
    "transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none";

  return (
    <>
      {/* Spotlight: dims everything but a rounded hole around the target. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute rounded-[18px] border-2 border-[var(--accent)] shadow-[0_0_0_9999px_color-mix(in_srgb,#0f0e0a_58%,transparent)] ${motion}`}
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: Math.min(hole.height / 2, 18),
        }}
      />
      <div
        ref={calloutRef}
        className={`onboarding-card-in absolute rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] px-3 pb-2.5 pt-2.5 text-[var(--ink)] ${motion}`}
        style={{ top: place.top, left: place.left, width: place.width }}
      >
        <span
          aria-hidden
          className="absolute h-3 w-3 border-l-2 border-t-2 border-[var(--ink)] bg-[var(--paper)]"
          style={{
            left: place.tailX - 6,
            ...(below
              ? { top: -8, transform: "rotate(45deg)" }
              : { bottom: -8, transform: "rotate(225deg)" }),
          }}
        />
        <h2
          id="onboarding-title"
          className="font-display text-lg font-normal uppercase leading-tight"
        >
          {step.title}
        </h2>
        <p className="mt-0.5 text-[13px] leading-snug text-[var(--ink-muted)]">{line}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          {dots}
          <div className="flex items-center gap-1">
            {canGoBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full px-2 py-1 text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Back
              </button>
            ) : null}
            <button
              ref={primaryRef}
              type="button"
              onClick={onNext}
              className="rounded-full px-2 py-1 text-[13px] font-bold text-[var(--accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
