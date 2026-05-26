/** Circular postmark for the newsletter letter header. */
export function OxfordPostmark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none flex shrink-0 items-center justify-center ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 88 88" className="h-14 w-14 sm:h-16 sm:w-16">
        <circle
          cx="44"
          cy="44"
          r="40"
          fill="none"
          stroke="var(--ink-soft)"
          strokeWidth="2"
          strokeDasharray="4 3"
          opacity="0.85"
        />
        <circle
          cx="44"
          cy="44"
          r="32"
          fill="none"
          stroke="var(--accent-hover)"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <text
          x="44"
          y="38"
          textAnchor="middle"
          fill="var(--ink-muted)"
          fontSize="8"
          fontFamily="var(--font-app)"
          letterSpacing="0.12em"
        >
          <tspan x="44" dy="0">
            OXFORD
          </tspan>
          <tspan x="44" dy="11" fontSize="7">
            TRINITY TERM
          </tspan>
        </text>
        <text
          x="44"
          y="58"
          textAnchor="middle"
          fill="var(--ink)"
          fontSize="9"
          fontFamily="var(--font-app)"
          fontWeight="bold"
        >
          oxformals
        </text>
      </svg>
    </div>
  );
}
