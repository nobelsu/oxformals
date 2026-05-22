export const COLLEGE_PAGE_SECTIONS = ["photos", "reviews", "listings"] as const;

export type CollegePageSection = (typeof COLLEGE_PAGE_SECTIONS)[number];

export const COLLEGE_PAGE_SECTION_LABELS: Record<CollegePageSection, string> = {
  photos: "Photos",
  reviews: "Reviews",
  listings: "Listings",
};

export function parseCollegePageSection(
  raw: string | null,
): CollegePageSection {
  if (raw === "reviews") return "reviews";
  if (raw === "listings") return "listings";
  return "photos";
}

export const DEFAULT_COLLEGE_PAGE_SECTION: CollegePageSection = "photos";
