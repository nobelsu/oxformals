"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePrefersReducedMotion } from "@/lib/hooks/usePaintCanvas";
import type { CollegeReviewPublic } from "@/lib/data/collegeReviews";

/* ------------------------------------------------------------------ */
/*  Shared mockup primitives (matching the real app components)        */
/* ------------------------------------------------------------------ */

const STAR_PATH =
  "m12 4 2.3 4.7L20 9.5l-4 3.9.9 5.6L12 16.5 7.1 19l.9-5.6-4-3.9 5.7-.8z";

function MockStar({ filled, index }: { filled: boolean; index: number }) {
  const wobble = (index - 3) * 1.25;
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      style={{ transform: `rotate(${wobble}deg) scale(${filled ? 1.05 : 1})` }}
      aria-hidden
    >
      <path
        d={STAR_PATH}
        fill={filled ? "var(--accent)" : "none"}
        stroke={filled ? "var(--ink)" : "var(--ink-soft)"}
        strokeWidth={filled ? 2 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.4}
      />
    </svg>
  );
}

function MockStarRow({ rating }: { rating: number }) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <MockStar key={s} filled={s <= rating} index={s} />
      ))}
    </div>
  );
}

function MockAvatar({ initials }: { initials: string }) {
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_18%,var(--bg))] text-xs text-[var(--ink-muted)]">
      {initials}
    </span>
  );
}

function ReviewsMockup({
  active = false,
  locked = false,
}: {
  active?: boolean;
  locked?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [upvoted, setUpvoted] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!active || reduced) {
      playedRef.current = false;
      setUpvoted(false);
      setSparkle(false);
      return;
    }
    if (!locked || playedRef.current) return;

    playedRef.current = true;
    setUpvoted(false);
    setSparkle(false);
    const upvoteTimer = window.setTimeout(() => setUpvoted(true), 120);
    const sparkleTimer = window.setTimeout(() => setSparkle(true), 260);
    const sparkleOffTimer = window.setTimeout(() => setSparkle(false), 1060);

    return () => {
      window.clearTimeout(upvoteTimer);
      window.clearTimeout(sparkleTimer);
      window.clearTimeout(sparkleOffTimer);
    };
  }, [active, locked, reduced]);

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className={feedItemCls}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[0.95rem]">Sasa &middot; Hertford</span>
          <span className="text-[0.85rem] text-[var(--ink-muted)]">18 Oct</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.85rem] text-[var(--ink-muted)]">Overall</span>
          <MockStarRow rating={4} />
        </div>
        <p className="mt-2 text-[0.9rem] italic text-[var(--ink-muted)]">
          &ldquo;Best hall of the term — go for the guest night if you can get one.&rdquo;
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" className="rounded-full border-[2px] border-[var(--ink)] px-2.5 py-1 text-sm leading-none">
            ▲
          </button>
          <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">12</span>
          <button type="button" className="rounded-full border-[2px] border-[var(--ink)] px-2.5 py-1 text-sm leading-none">
            ▼
          </button>
        </div>
      </div>

      <div className={feedItemCls}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[0.95rem]">Emma &middot; Balliol</span>
          <span className="text-[0.85rem] text-[var(--ink-muted)]">15 Oct</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.85rem] text-[var(--ink-muted)]">Overall</span>
          <MockStarRow rating={5} />
        </div>
        <p className="mt-2 text-[0.9rem] italic text-[var(--ink-muted)]">
          &ldquo;Harry Potter hall lives up to the hype. The portraits were watching.&rdquo;
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="rounded-full border-[2px] border-[var(--ink)] px-2.5 py-1 text-sm leading-none transition-all duration-250"
              style={{
                backgroundColor: upvoted ? "var(--ink)" : "transparent",
                color: upvoted ? "var(--bg)" : "var(--ink)",
                transform: upvoted ? "translateY(-1px) scale(1.05)" : "translateY(0) scale(1)",
              }}
            >
              ▲
            </button>

            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{
                opacity: sparkle ? 0.95 : 0,
                transform: sparkle
                  ? "translate(-50%, -50%) scale(1)"
                  : "translate(-50%, -50%) scale(0.4)",
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent) 0%, color-mix(in srgb, var(--accent) 12%, transparent) 40%, transparent 72%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -left-1 -top-2 text-[0.68rem] text-[var(--accent)] transition-all duration-500"
              style={{
                opacity: sparkle ? 1 : 0,
                transform: sparkle ? "translateY(-4px) scale(1)" : "translateY(2px) scale(0.8)",
              }}
            >
              ✦
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute right-[-0.45rem] top-[-0.55rem] text-[0.55rem] text-[var(--accent)] transition-all duration-500"
              style={{
                opacity: sparkle ? 1 : 0,
                transform: sparkle ? "translateY(-5px) scale(1)" : "translateY(3px) scale(0.8)",
              }}
            >
              ✧
            </span>
          </div>
          <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
            {upvoted ? 9 : 8}
          </span>
          <button type="button" className="rounded-full border-[2px] border-[var(--ink)] px-2.5 py-1 text-sm leading-none">
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

function WishlistAlertsMockup({ animate = false }: { animate?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const message = "Hey would love to swap for Univ!";
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!animate || reduced) {
      setVisible(false);
      setTyped(message);
      setSent(false);
      return;
    }

    setVisible(false);
    setTyped("");
    setSent(false);

    const popupTimer = window.setTimeout(() => {
      setVisible(true);
    }, 220);

    const typingStartTimer = window.setTimeout(() => {
      let idx = 0;
      const interval = window.setInterval(() => {
        idx += 1;
        setTyped(message.slice(0, idx));
        if (idx >= message.length) {
          window.clearInterval(interval);
          window.setTimeout(() => setSent(true), 260);
        }
      }, 24);
    }, 420);

    return () => {
      window.clearTimeout(popupTimer);
      window.clearTimeout(typingStartTimer);
    };
  }, [animate, reduced]);

  return (
    <div className="relative flex flex-col gap-2 pt-1">
      <div className={feedItemCls}>
        <div className="flex items-center gap-2">
          <MockAvatar initials="JO" />
          <span className="text-[0.95rem] leading-snug">Jonah listed a formal at Magdalen</span>
        </div>
        <p className="mt-1.5 text-[0.9rem] text-[var(--ink-muted)]">
          On your wishlist &middot; 3 seats left &middot; 20 Oct
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border-[2px] border-[var(--tag)] bg-[var(--tag)] px-4 py-1 text-sm font-medium text-[var(--tag-ink)]">
            Swap
          </span>
          <button
            type="button"
            className="whitespace-nowrap rounded-full bg-[var(--accent)] px-5 py-2 text-[0.875rem] text-[var(--accent-ink)] transition-all duration-300"
            style={{
              transform: sent ? "translateY(-1px)" : "translateY(0)",
              boxShadow: sent ? "0 3px 0 color-mix(in srgb, var(--ink) 20%, transparent)" : "none",
            }}
          >
            {sent ? "Sent \u2713" : "Request"}
          </button>
        </div>
      </div>

      <div className={`${feedItemCls} opacity-50`}>
        <div className="flex items-center gap-2">
          <MockAvatar initials="PR" />
          <span className="text-[0.95rem] leading-snug">Priya listed a formal at Balliol</span>
        </div>
        <p className="mt-1.5 text-[0.9rem] text-[var(--ink-muted)]">
          On your wishlist &middot; 1 seat left &middot; 25 Oct
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute right-4 top-[4.5rem] max-w-[16rem] rounded-[11px] border border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,white)] px-3 py-2 text-[0.8rem] leading-relaxed text-[var(--ink-muted)] shadow-[0_8px_20px_color-mix(in_srgb,var(--ink)_18%,transparent)] transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
        }}
      >
        {typed}
        {visible && !sent && typed.length < message.length ? (
          <span className="ml-0.5 inline-block h-[0.9em] w-[1px] animate-pulse bg-[var(--ink-muted)] align-[-0.1em]" />
        ) : null}
      </div>
    </div>
  );
}

function ActivityFeedMockup({ animate = false }: { animate?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!animate || reduced) {
      setVisible(false);
      setPulse(false);
      return;
    }
    setVisible(false);
    setPulse(false);
    const timer = window.setTimeout(() => setVisible(true), 280);
    const pulseTimer = window.setTimeout(() => setPulse(true), 560);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(pulseTimer);
    };
  }, [animate, reduced]);

  return (
    <div className="relative">
      <ul className="flex flex-col gap-2 pt-1">
        {[
          { initials: "JO", line: "Jonah swapped with Alex at Keble", body: "Both swapping \u00b7 Confirmed", italic: false },
          { initials: "LI", line: "Lily is going to St John's tonight", body: "With 2 people you follow", italic: false },
          { initials: "MK", line: "Mike reviewed Magdalen", body: "\u201cAbsolutely incredible wine selection\u201d", italic: true },
        ].map((item) => (
          <li key={item.line} className={feedItemCls}>
            <div className="flex items-center gap-2">
              <MockAvatar initials={item.initials} />
              <span className="text-[0.95rem] leading-snug">{item.line}</span>
            </div>
            <p className={`mt-1.5 text-[0.9rem] text-[var(--ink-muted)] ${item.italic ? "italic" : ""}`}>
              {item.body}
            </p>
          </li>
        ))}
      </ul>

      <div
        aria-hidden
        className="pointer-events-none absolute right-3 top-[4.9rem] rounded-full border border-[color-mix(in_srgb,var(--ink)_16%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,white)] px-2.5 py-1.5 shadow-[0_8px_20px_color-mix(in_srgb,var(--ink)_18%,transparent)] transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_14%,var(--bg))] text-[10px] text-[var(--ink-muted)]">
            JO
          </span>
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_10%,var(--bg))] text-[10px] text-[var(--ink-muted)] transition-transform duration-300"
            style={{ transform: pulse ? "scale(1.08)" : "scale(1)" }}
          >
            AX
          </span>
          <span className="ml-0.5 text-[0.68rem] font-medium text-[var(--ink-muted)]">
            you follow
          </span>
        </div>
      </div>
    </div>
  );
}

type CollegePreview = {
  imageUrls: string[];
  quotes: string[];
};

function previewFromReviews(
  reviews: CollegeReviewPublic[] | undefined,
): CollegePreview | null {
  if (!reviews || reviews.length === 0) return null;
  const withImages = reviews.filter(
    (review) => review.imageUrls && review.imageUrls.length > 0,
  );
  if (withImages.length === 0) return null;

  const imageUrls = withImages
    .flatMap((review) => review.imageUrls ?? [])
    .filter((url): url is string => Boolean(url))
    .slice(0, 2);
  if (imageUrls.length === 0) return null;

  const quotes = withImages
    .map((review) => review.comment?.trim())
    .filter((comment): comment is string => Boolean(comment))
    .slice(0, 2);

  return { imageUrls, quotes };
}

function HallRankingsMockup({ animate = false }: { animate?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);

  const magdalenReviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college: "Magdalen",
    sort: "recent",
    limit: 20,
  });
  const exeterReviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college: "Exeter",
    sort: "recent",
    limit: 20,
  });
  const worcesterReviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college: "Worcester",
    sort: "recent",
    limit: 20,
  });
  const stJohnsReviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college: "St John's",
    sort: "recent",
    limit: 20,
  });
  const balliolReviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college: "Balliol",
    sort: "recent",
    limit: 20,
  });

  const previewsByCollege: Record<string, CollegePreview | null> = {
    Magdalen: previewFromReviews(magdalenReviews),
    Exeter: previewFromReviews(exeterReviews),
    Worcester: previewFromReviews(worcesterReviews),
    "St John's": previewFromReviews(stJohnsReviews),
    Balliol: previewFromReviews(balliolReviews),
  };
  const selectedPreview = selected ? previewsByCollege[selected] : null;
  const hasPreview = Boolean(selectedPreview);

  useEffect(() => {
    if (!animate || reduced) {
      setSelected(null);
      return;
    }
    setSelected(null);
    const timer = window.setTimeout(() => setSelected("Exeter"), 560);
    return () => window.clearTimeout(timer);
  }, [animate, reduced]);

  const rows = [
    { rank: 1, name: "Magdalen", score: 4.8, reviews: 24 },
    { rank: 2, name: "Exeter", score: 4.7, reviews: 31 },
    { rank: 3, name: "Worcester", score: 4.6, reviews: 18 },
    { rank: 4, name: "St John's", score: 4.5, reviews: 22 },
    { rank: 5, name: "Balliol", score: 4.4, reviews: 15 },
  ] as const;

  return (
    <div className="relative">
      <div className="flex flex-col pt-1">
        {rows.map((c) => {
          const isSelected = selected === c.name;
          return (
            <button
              key={c.rank}
              type="button"
              onClick={() => setSelected(c.name)}
              className="flex items-center gap-3 border-t border-[var(--ink)]/10 px-3 py-2.5 text-left first:border-t-0"
              style={{
                backgroundColor: isSelected
                  ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                  : "transparent",
              }}
            >
              <span className="w-6 shrink-0 text-center text-sm text-[var(--ink-soft)]">
                {c.rank}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm uppercase tracking-wide">
                  {c.name}
                </span>
                <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
                  {c.reviews} reviews
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1">
                <span className="font-display text-sm text-[var(--accent)]">{c.score.toFixed(1)}</span>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <path
                    d={STAR_PATH}
                    fill="var(--accent)"
                    stroke="var(--ink)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          );
        })}
      </div>

      <div
        aria-hidden={!selected}
        className="pointer-events-none absolute inset-x-2 top-2 rounded-[12px] border border-[color-mix(in_srgb,var(--ink)_16%,transparent)] bg-[color-mix(in_srgb,var(--bg)_95%,white)] p-2 shadow-[0_12px_26px_color-mix(in_srgb,var(--ink)_20%,transparent)] transition-all duration-300"
        style={{
          opacity: selected ? 1 : 0,
          transform: selected ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[0.72rem] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            {selected ? `${selected} menu highlights` : "Menu highlights"}
          </span>
          <span className="text-[0.7rem] text-[var(--accent)]">
            {rows.find((row) => row.name === selected)?.score.toFixed(1) ?? ""}
          </span>
        </div>
        {hasPreview ? (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {selectedPreview!.imageUrls.map((imageUrl, index) => (
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt={`${selected} review food photo ${index + 1}`}
                  className="h-20 w-full rounded-[8px] object-cover"
                  loading="lazy"
                />
              ))}
            </div>
            <div className="mt-2 space-y-1 text-[0.72rem] leading-snug text-[var(--ink-muted)]">
              {(selectedPreview!.quotes.length > 0
                ? selectedPreview!.quotes
                : ["Photos from recent college reviews."]).map((quote, index) => (
                <p key={`${quote}-${index}`}>
                  &ldquo;{quote}&rdquo;
                </p>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[0.75rem] leading-relaxed text-[var(--ink-muted)]">
            No food photos in recent reviews for this college yet.
          </p>
        )}
      </div>
    </div>
  );
}

/** Matches the HeroFeedSlide / real feed item border style. */
const feedItemCls =
  "rounded-[12px] border border-[color-mix(in_srgb,var(--ink)_14%,transparent)] p-3";

/* ------------------------------------------------------------------ */
/*  Feed feature data                                                  */
/* ------------------------------------------------------------------ */

interface FeedFeature {
  tag: string;
  title: string;
  description: string;
  mockup: ReactNode;
}

const FEED_FEATURES: FeedFeature[] = [
  {
    tag: "Reviews",
    title: "See what people actually thought",
    description:
      "Your feed shows reviews from people you follow — honest takes on the food, wine, and vibe at every college.",
    mockup: <ReviewsMockup />,
  },
  {
    tag: "Wishlist alerts",
    title: "Never miss a seat at your dream college",
    description:
      "Add colleges to your wishlist and get pinged the moment someone lists a formal there.",
    mockup: (
      <WishlistAlertsMockup />
    ),
  },
  {
    tag: "Activity feed",
    title: "Follow your friends across Oxford",
    description:
      "See who went where, who swapped with whom, and discover colleges you never thought to try.",
    mockup: <ActivityFeedMockup />,
  },
  {
    tag: "Hall rankings",
    title: "The ultimate Oxford hall tier list",
    description:
      "Community-ranked colleges updated in real time. See which halls are trending this term.",
    mockup: <HallRankingsMockup />,
  },
];

/* ------------------------------------------------------------------ */
/*  Scroll-locked section                                              */
/* ------------------------------------------------------------------ */

const FRAMES = FEED_FEATURES.length;
const SCROLL_PER_FRAME = 165; // svh per frame — longer dwell so slide animations can finish
/** Scroll depth within the reviews frame before the demo upvote plays. */
const REVIEWS_UPVOTE_SCROLL = 0.5;

export function LandingSocialTeaser() {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [frameProgress, setFrameProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const range = wrap.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(range, 1));
      const p = range > 0 ? scrolled / range : 0;
      const frame = Math.min(FRAMES - 1, Math.floor(p * FRAMES));
      const frameStart = frame / FRAMES;
      const progressInFrame =
        FRAMES > 0 ? (p - frameStart) * FRAMES : 0;
      setActive(frame);
      setFrameProgress(Math.min(1, Math.max(0, progressInFrame)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  /* ---- Reduced-motion fallback: plain stacked list ---- */
  if (reduced) {
    return (
      <section className="py-16">
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Follow people, not just formals
        </h2>
        <p className="mt-3 max-w-[50ch] text-base leading-relaxed text-[var(--ink-muted)]">
          OxFormals isn&rsquo;t just listings — it&rsquo;s a feed.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {FEED_FEATURES.map((f) => (
            <div key={f.tag}>
              <span className="inline-block rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-wash-ink)]">
                {f.tag}
              </span>
              <h3 className="mt-4 text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{f.description}</p>
              <div className="mt-4" aria-hidden>{f.mockup}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ---- Scroll-locked version ---- */
  return (
    <section
      ref={wrapRef}
      aria-label="Follow people, not just formals"
      className="relative"
      style={{ height: `${FRAMES * SCROLL_PER_FRAME}svh` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-6 px-4 sm:px-6 md:grid md:grid-cols-2 md:gap-10">
          {/* Left side: text that changes per feature */}
          <div className="flex w-full flex-col justify-center">
            <span className="font-display text-sm uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Follow people, not just formals
            </span>

            <div className="relative mt-4 h-[140px] sm:mt-6 sm:h-[180px]">
              {FEED_FEATURES.map((feature, i) => {
                const state = active === i ? 0 : active > i ? -1 : 1;
                return (
                  <div
                    key={feature.tag}
                    aria-hidden={active !== i}
                    className="absolute inset-x-0 top-0 transition-[opacity,transform] duration-500 ease-out"
                    style={{
                      opacity: state === 0 ? 1 : 0,
                      transform: `translateY(${state * 24}px)`,
                      pointerEvents: state === 0 ? "auto" : "none",
                    }}
                  >
                    <span className="inline-block rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-wash-ink)]">
                      {feature.tag}
                    </span>
                    <h3 className="mt-3 text-xl font-bold leading-snug sm:mt-4 sm:text-2xl md:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-[var(--ink-muted)] sm:mt-3 sm:text-base">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right side: mockup card that fades/slides */}
          <div className="relative flex w-full items-center" style={{ minHeight: 220 }}>
            {FEED_FEATURES.map((feature, i) => {
              const state = active === i ? 0 : active > i ? -1 : 1;
              return (
                <div
                  key={feature.tag}
                  aria-hidden={active !== i}
                  className="absolute inset-x-0 transition-[opacity,transform] duration-500 ease-out"
                  style={{
                    opacity: state === 0 ? 1 : 0,
                    transform: `translateY(${state * 32}px)`,
                    pointerEvents: state === 0 ? "auto" : "none",
                  }}
                >
                  {feature.tag === "Reviews" ? (
                    <ReviewsMockup
                      active={active === i}
                      locked={
                        active === i &&
                        frameProgress >= REVIEWS_UPVOTE_SCROLL
                      }
                    />
                  ) : feature.tag === "Wishlist alerts" ? (
                    <WishlistAlertsMockup animate={active === i} />
                  ) : feature.tag === "Activity feed" ? (
                    <ActivityFeedMockup animate={active === i} />
                  ) : feature.tag === "Hall rankings" ? (
                    <HallRankingsMockup animate={active === i} />
                  ) : (
                    feature.mockup
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress ticks */}
        <div className="absolute bottom-[10svh] left-1/2 flex -translate-x-1/2 gap-2">
          {FEED_FEATURES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: active === i ? 28 : 8,
                backgroundColor:
                  active >= i
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--ink) 20%, transparent)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
