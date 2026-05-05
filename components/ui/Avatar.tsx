import type { AvatarSource } from "@/lib/auth/types";

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-[4.235rem] w-[4.235rem] text-[1.3475rem] leading-none",
};

const PRESET_GLYPH_SIZES: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
};

export const PRESET_AVATARS: Array<{ id: string; emoji: string }> = [
  { id: "fox", emoji: "🦊" },
  { id: "bear", emoji: "🐻" },
  { id: "owl", emoji: "🦉" },
  { id: "rose", emoji: "🌹" },
  { id: "star", emoji: "⭐" },
  { id: "wave", emoji: "🌊" },
  { id: "leaf", emoji: "🍃" },
  { id: "moon", emoji: "🌙" },
];

const PRESET_GLYPHS: Record<string, string> = Object.fromEntries(
  PRESET_AVATARS.map((p) => [p.id, p.emoji]),
);

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  source,
}: {
  name: string;
  size?: Size;
  source?: AvatarSource;
}) {
  const containerCls = `relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_18%,var(--bg))] text-[var(--ink-muted)] border-[2px] border-[var(--ink)] ${SIZES[size]}`;

  if (source?.kind === "image") {
    return (
      <div className={containerCls} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source.dataUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (source?.kind === "preset") {
    const glyph = PRESET_GLYPHS[source.id];
    if (glyph) {
      return (
        <div className={containerCls} aria-hidden>
          <span className={`leading-none ${PRESET_GLYPH_SIZES[size]}`}>
            {glyph}
          </span>
        </div>
      );
    }
  }

  return (
    <div className={containerCls} aria-hidden>
      {initialsFor(name)}
    </div>
  );
}
