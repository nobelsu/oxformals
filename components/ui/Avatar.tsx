import type { AvatarSource } from "@/lib/auth/types";

import type { SVGProps } from "react";

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

export const PRESET_AVATARS: Array<{ id: string; label: string }> = [
  { id: "fox", label: "Fox" },
  { id: "bear", label: "Bear" },
  { id: "owl", label: "Owl" },
  { id: "rose", label: "Rose" },
  { id: "star", label: "Star" },
  { id: "wave", label: "Wave" },
  { id: "leaf", label: "Leaf" },
  { id: "moon", label: "Moon" },
];

function PresetIconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function PresetAvatarIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  switch (id) {
    case "fox":
      return (
        <PresetIconBase className={className}>
          <path d="M6 11 4 6l5 3 3-4 3 4 5-3-2 5v5a6 6 0 0 1-12 0z" />
          <path d="M9.5 14h.01M14.5 14h.01M10 17c.5.5 1.2.8 2 .8s1.5-.3 2-.8" />
        </PresetIconBase>
      );
    case "bear":
      return (
        <PresetIconBase className={className}>
          <path d="M7 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM17 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
          <path d="M12 20a7 7 0 0 0 7-7v-1a7 7 0 1 0-14 0v1a7 7 0 0 0 7 7Z" />
          <path d="M10 14h4M12 14v2" />
        </PresetIconBase>
      );
    case "owl":
      return (
        <PresetIconBase className={className}>
          <path d="M7 6v5M17 6v5M5 11a7 7 0 1 0 14 0" />
          <circle cx="9.5" cy="12" r="1.5" />
          <circle cx="14.5" cy="12" r="1.5" />
          <path d="m12 13.5-1 2h2z" />
        </PresetIconBase>
      );
    case "rose":
      return (
        <PresetIconBase className={className}>
          <path d="M12 14c3 0 5-2.2 5-4.5S15 5 12 5 7 7.2 7 9.5s2 4.5 5 4.5Z" />
          <path d="M12 14v5M9 19h6M10 10c1 .8 3 .8 4 0" />
        </PresetIconBase>
      );
    case "star":
      return (
        <PresetIconBase className={className}>
          <path d="m12 4 2.3 4.7L20 9.5l-4 3.9.9 5.6L12 16.5 7.1 19l.9-5.6-4-3.9 5.7-.8z" />
        </PresetIconBase>
      );
    case "wave":
      return (
        <PresetIconBase className={className}>
          <path d="M3 11c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" />
          <path d="M3 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" />
        </PresetIconBase>
      );
    case "leaf":
      return (
        <PresetIconBase className={className}>
          <path d="M6 14c0-5 4-8 12-8 0 8-3 12-8 12-2.2 0-4-1.8-4-4Z" />
          <path d="M8 16c2-2 4-4 8-6" />
        </PresetIconBase>
      );
    case "moon":
      return (
        <PresetIconBase className={className}>
          <path d="M15 4.5a8 8 0 1 0 4.5 14.5A7 7 0 0 1 15 4.5Z" />
        </PresetIconBase>
      );
    default:
      return null;
  }
}

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
    const hasPreset = PRESET_AVATARS.some((preset) => preset.id === source.id);
    if (hasPreset) {
      return (
        <div className={containerCls} aria-hidden>
          <PresetAvatarIcon
            id={source.id}
            className={`h-[1em] w-[1em] ${PRESET_GLYPH_SIZES[size]}`}
          />
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
