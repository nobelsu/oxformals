import type { FormalType } from "@/lib/data/types";

type IconProps = { className?: string };

/** A slightly wobbly, hand-drawn heart — matchmaking. */
function HeartIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20.5c-.6-.4-6.6-4.4-8.7-8.2-1.6-3 .1-6.3 3.2-6.4 2-.1 3.4 1.1 4.2 2.5.7-1.4 2.1-2.7 4.2-2.6 3.1.1 4.7 3.4 3.1 6.4-2 3.8-7.6 7.9-8 8.3Z" />
    </svg>
  );
}

/** Two little friends side by side — social. */
function FriendsIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8.2" cy="8" r="2.5" />
      <circle cx="15.8" cy="8" r="2.5" />
      <path d="M3.5 19c0-2.7 2.1-4.4 4.7-4.4 1.2 0 2.2.4 3 1" />
      <path d="M12.8 15.6c.8-.6 1.8-1 3-1 2.6 0 4.7 1.7 4.7 4.4" />
    </svg>
  );
}

/** A little bow tie — networking (dressed up, formal). */
function BowTieIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 12 4.5 8.2c-.6-.3-1.3.1-1.3.8v6c0 .7.7 1.1 1.3.8L11 12Z" />
      <path d="M13 12l6.5-3.8c.6-.3 1.3.1 1.3.8v6c0 .7-.7 1.1-1.3.8L13 12Z" />
      <path d="M11 12h2" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

const CONFIG: Record<
  FormalType,
  { label: string; Icon: (props: IconProps) => React.ReactElement }
> = {
  matchmaking: { label: "Matchmaking", Icon: HeartIcon },
  social: { label: "Social", Icon: FriendsIcon },
  networking: { label: "Networking", Icon: BowTieIcon },
};

type Props = {
  formalType: FormalType;
  /** Hide the text label and show just the icon (with an accessible label). */
  iconOnly?: boolean;
  className?: string;
};

export function FormalTypeTag({ formalType, iconOnly = false, className = "" }: Props) {
  const { label, Icon } = CONFIG[formalType];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_16%,transparent)] bg-[var(--accent-wash)] px-2 py-0.5 text-[0.72rem] font-medium text-[var(--accent-wash-ink)] ${className}`.trim()}
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      {iconOnly ? null : label}
    </span>
  );
}
