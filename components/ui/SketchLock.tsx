type Props = {
  className?: string;
};

/** Paper-drawn padlock — wobbly stroke, matches the sketch UI. */
export function SketchLock({ className = "h-4 w-4" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      aria-hidden
    >
      {/* Slightly lopsided shackle */}
      <path
        d="M8.1 11.2 C7.9 8.6 8.2 5.4 12.05 5.25 C15.7 5.15 16.4 8.2 16.15 11.35"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wonky body */}
      <path
        d="M6.4 11.1 C6.15 11.05 5.9 11.4 5.95 12.1 L6.35 19.05 C6.4 19.85 6.9 20.35 7.75 20.4 L16.35 20.55 C17.2 20.55 17.7 20.05 17.7 19.2 L17.15 11.95 C17.1 11.25 16.75 10.95 16.05 11 L6.4 11.1 Z"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Keyhole */}
      <circle
        cx="11.9"
        cy="14.6"
        r="1.15"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M11.85 15.6 L12.15 17.55"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
