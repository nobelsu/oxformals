"use client";

import { SketchCard, seedFrom } from "@/components/ui/SketchCard";

type Phase = "idle" | "opening";

type Props = {
  phase: Phase;
  onOpen: () => void;
  disabled?: boolean;
};

/** Sealed closed envelope — wax seal on the flap fold. */
export function LetterEnvironment({ phase, onOpen, disabled }: Props) {
  const isOpening = phase === "opening";

  return (
    <div
      className={[
        "letter-invite flex min-h-dvh w-full flex-col items-center justify-center px-4 py-10",
        isOpening ? "letter-invite--opening" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Sealed formal invite; activate seal to read"
    >
      <svg
        viewBox="0 0 120 200"
        className="letter-invite-spire pointer-events-none absolute right-[8%] top-[14%] h-36 w-20 text-[var(--ink)] opacity-[0.07] sm:right-[12%] sm:top-[12%]"
        aria-hidden
      >
        <path
          d="M60 8 L72 48 L68 48 L70 120 L50 120 L52 48 L48 48 Z M56 120 L56 168 L44 188 L76 188 L64 168 L64 120"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>

      <div className="letter-invite-stage relative z-10 flex w-full max-w-[19rem] flex-col items-center sm:max-w-[21rem]">
        <SketchCard
          seed={seedFrom("letter-invite")}
          className="letter-invite-card w-full bg-[var(--paper)]"
          padded={false}
        >
          <div className="flex min-h-[17.5rem] items-center justify-center px-6 py-8 sm:min-h-[19rem] sm:py-10">
            <div className="letter-invite-envelope relative w-full max-w-[14.5rem]">
              <svg
                viewBox="0 0 248 260"
                className="mx-auto block h-auto w-full text-[var(--ink)]"
                aria-hidden
              >
                {/* Envelope body */}
                <rect
                  x="20"
                  y="88"
                  width="208"
                  height="152"
                  rx="3"
                  fill="var(--paper)"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />

                {/* Closed flap (solid paper — nothing visible inside) */}
                <g className="letter-invite-flap">
                  <path
                    d="M20 88 L124 178 L228 88 Z"
                    fill="var(--paper)"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="20"
                    y1="88"
                    x2="124"
                    y2="178"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.2"
                  />
                  <line
                    x1="228"
                    y1="88"
                    x2="124"
                    y2="178"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.2"
                  />
                </g>
              </svg>

              {/* Seal on flap fold only — no label overlap below */}
              <div className="absolute left-1/2 top-[68%] z-10 -translate-x-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={onOpen}
                  disabled={disabled || isOpening}
                  aria-label="Break the seal to open newsletter"
                  className={[
                    "letter-invite-seal flex h-16 w-16 flex-col items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_5px_0_var(--ink)] transition-[transform,opacity,background-color]",
                    "hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink)]",
                    "disabled:pointer-events-none motion-reduce:transition-none",
                    !disabled && !isOpening
                      ? "letter-seal-wiggle hover:scale-105 active:scale-95"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="font-display text-[9px] uppercase leading-tight tracking-widest">
                    Break
                  </span>
                  <span className="font-display text-[9px] uppercase leading-tight tracking-widest">
                    seal
                  </span>
                </button>
              </div>
            </div>
          </div>
        </SketchCard>

        {!isOpening && (
          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <p className="newsletter-hint-pulse font-display text-sm uppercase tracking-[0.2em] text-[var(--ink-muted)] motion-reduce:opacity-80">
              Break the seal
            </p>
            <p className="max-w-xs text-sm text-[var(--ink-soft)]">
              Trinity term note from oxformals
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
