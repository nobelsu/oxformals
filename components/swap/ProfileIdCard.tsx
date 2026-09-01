import type { ReactNode } from "react";
import { SketchLock } from "@/components/ui/SketchLock";
import { TOTAL_BADGE_COUNT, badgeById } from "@/lib/data/badges";

type EarnedBadge = { badgeId: string };

type Props = {
  photo: ReactNode;
  name: ReactNode;
  status: ReactNode;
  college: ReactNode;
  extras?: ReactNode;
  validUntil: ReactNode;
  earnedBadges?: EarnedBadge[];
  onOpenBadges?: () => void;
  /** Accessible name for the card (usually the person's name). */
  labelledBy?: string;
  className?: string;
};

function CardWatermark() {
  return (
    <svg
      viewBox="0 0 220 180"
      className="pointer-events-none absolute -right-2 top-0 h-[118%] w-auto text-[var(--accent)] opacity-[0.10]"
      aria-hidden
    >
      <path
        d="M30 168V92c0-38 28-62 80-70 52 8 80 32 80 70v76"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
      />
      <ellipse cx="110" cy="24" rx="16" ry="7" fill="currentColor" />
      <path
        d="M110 8v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M48 92h124M48 168h124"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      {[58, 78, 98, 118, 138, 158].map((x) => (
        <path
          key={x}
          d={`M${x} 92v76`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
      ))}
      <path
        d="M40 80 Q110 48 180 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function CardBadgeRow({
  earned,
  onOpen,
}: {
  earned: EarnedBadge[] | undefined;
  onOpen?: () => void;
}) {
  const earnedCount = earned?.length ?? 0;
  const label = onOpen
    ? `Badges, ${earnedCount} of ${TOTAL_BADGE_COUNT} earned. Open badge case.`
    : `Badges, ${earnedCount} of ${TOTAL_BADGE_COUNT} earned`;

  const marks = Array.from({ length: 4 }, (_, i) => {
    const item = earned?.[i];
    const def = item ? badgeById(item.badgeId) : undefined;
    return (
      <span
        key={def?.id ?? `empty-${i}`}
        title={def?.name ?? "Locked badge"}
        className={`flex h-[8cqi] w-[8cqi] shrink-0 items-center justify-center rounded-full border-[1.6px] bg-[#f6f3ec] text-[length:3.6cqi] leading-none ${
          def
            ? "border-[#161616]"
            : "border-dashed border-[#161616]/50 opacity-55"
        }`}
      >
        {def ? def.icon : <SketchLock className="h-[4cqi] w-[4cqi]" />}
      </span>
    );
  });

  const className =
    "flex min-h-[72%] min-w-0 flex-1 items-center justify-end gap-[0.55em]";

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className={`${className} cursor-pointer transition-opacity hover:opacity-80`}
      >
        {marks}
      </button>
    );
  }

  return (
    <div role="img" aria-label={label} className={className}>
      {marks}
    </div>
  );
}

/**
 * Landscape Oxford-style ID card chrome. Slots are filled by edit (inputs)
 * or view (printed text) so both pages share the same plastic.
 */
export function ProfileIdCard({
  photo,
  name,
  status,
  college,
  extras,
  validUntil,
  earnedBadges,
  onOpenBadges,
  labelledBy,
  className = "",
}: Props) {
  return (
    <div
      className={`@container w-full max-w-[36rem] ${className}`.trim()}
      style={{ containerType: "inline-size" }}
    >
      <article
        aria-labelledby={labelledBy}
        className="relative w-full overflow-visible rounded-[3px] bg-[#f6f3ec] font-[ui-sans-serif,system-ui,'Segoe_UI',sans-serif] text-[#161616] shadow-[0_10px_28px_-16px_rgba(0,20,40,0.55),0_1px_0_rgba(0,0,0,0.12)] ring-1 ring-black/15"
        style={{ aspectRatio: "1.68 / 1" }}
      >
        <header className="flex h-[13.5%] items-center justify-center rounded-t-[3px] bg-[var(--accent)]">
          <p className="m-0 font-display whitespace-nowrap text-[length:5.6cqi] uppercase leading-none tracking-[0.12em] text-[var(--accent-ink)]">
            Oxformals
          </p>
        </header>

        <div className="flex h-[62%] gap-[3.6%] px-[3.2%] pt-[3%]">
          <div className="relative z-20 h-full w-[30%] shrink-0 bg-[#d8d4cb] ring-1 ring-black/20">
            {photo}
          </div>
          <div className="relative min-w-0 flex-1">
            <CardWatermark />
            <div className="relative flex h-full min-w-0 flex-col">
              <div className="shrink-0 text-[length:5.4cqi] font-bold leading-[1.15] tracking-tight">
                {name}
              </div>
              <div className="mt-[0.35em] shrink-0 text-[length:3.15cqi] leading-snug">
                {status}
              </div>
              <div className="mt-[0.2em] shrink-0 text-[length:3.35cqi] leading-snug">
                {college}
              </div>
              {extras ? (
                <div className="mt-auto min-h-0 flex-1 overflow-hidden pt-[0.4em] text-[length:2.55cqi] leading-snug text-[#3a3a3a]">
                  {extras}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="flex h-[24.5%] items-end justify-between gap-[4%] px-[3.2%] pb-[3.4%]">
          <div className="flex min-h-[72%] min-w-[30%] flex-col justify-center bg-[var(--accent-wash)] px-[0.7em] py-[0.35em] text-[var(--accent-wash-ink)]">
            <p className="m-0 text-[length:2.1cqi] font-semibold tracking-[0.14em]">
              CURRENTLY
            </p>
            <div className="text-[length:4.6cqi] font-bold leading-none tracking-normal">
              {validUntil}
            </div>
          </div>
          <CardBadgeRow earned={earnedBadges} onOpen={onOpenBadges} />
        </footer>
      </article>
    </div>
  );
}
