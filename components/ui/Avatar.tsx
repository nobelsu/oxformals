type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: Size;
}) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ink)_18%,var(--bg))] text-[var(--ink-muted)] border-[2px] border-[var(--ink)] ${SIZES[size]}`}
      aria-hidden
    >
      {initialsFor(name)}
    </div>
  );
}
