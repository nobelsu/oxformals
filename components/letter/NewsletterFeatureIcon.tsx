import { StarIcon } from "@/components/colleges/StarRating";

export type NewsletterFeatureIconName = "envelope" | "star" | "layout";

type Props = {
  name: NewsletterFeatureIconName;
  className?: string;
};

/** Hand-drawn icons for newsletter feature headings (replaces emoji). */
export function NewsletterFeatureIcon({ name, className = "h-5 w-5 shrink-0" }: Props) {
  if (name === "star") {
    return <StarIcon className={className} />;
  }

  if (name === "envelope") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        aria-hidden
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M3 7 L12 13.5 L21 7 Z"
          fill="var(--accent)"
          fillOpacity="0.45"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M3 17 L8 13 M21 17 L16 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
    >
      <rect
        x="3"
        y="4"
        width="8"
        height="16"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="13"
        y="4"
        width="8"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line x1="15" y1="8" x2="19" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect
        x="13"
        y="16"
        width="8"
        height="4"
        rx="1"
        fill="var(--accent)"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.85"
      />
    </svg>
  );
}
