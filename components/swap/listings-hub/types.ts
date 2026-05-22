export const LISTINGS_SECTIONS = [
  "overview",
  "listings",
  "pay",
  "attended",
] as const;

export type ListingsSection = (typeof LISTINGS_SECTIONS)[number];

export const LISTINGS_SECTION_LABELS: Record<ListingsSection, string> = {
  overview: "Overview",
  listings: "My listings",
  pay: "Pay requests",
  attended: "Formals attended",
};

const SECTION_ALIASES: Record<string, ListingsSection> = {
  active: "listings",
  past: "listings",
};

export function parseListingsSection(
  raw: string | null,
): ListingsSection {
  if (!raw) return "overview";
  if ((LISTINGS_SECTIONS as readonly string[]).includes(raw)) {
    return raw as ListingsSection;
  }
  return SECTION_ALIASES[raw] ?? "overview";
}

export const DEFAULT_LISTINGS_SECTION: ListingsSection = "overview";
