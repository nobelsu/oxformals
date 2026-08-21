import { OXFORD_COLLEGES } from "./colleges";

export type BadgeFamily = "milestone" | "college";
export type BadgeMetric = "formals" | "reviews";

export type MilestoneBadgeDefinition = {
  id: string;
  family: "milestone";
  metric: BadgeMetric;
  threshold: number;
  name: string;
  icon: string;
  description: string;
};

export type CollegeBadgeDefinition = {
  id: string;
  family: "college";
  college: string;
  name: string;
  icon: string;
  description: string;
};

export type BadgeDefinition = MilestoneBadgeDefinition | CollegeBadgeDefinition;

const COLLEGE_BADGE_ICON = "🏛️";

function collegeSlug(college: string): string {
  return college.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  {
    id: "formals-1",
    family: "milestone",
    metric: "formals",
    threshold: 1,
    name: "First Formal",
    icon: "🎉",
    description: "Attended your first formal.",
  },
  {
    id: "formals-5",
    family: "milestone",
    metric: "formals",
    threshold: 5,
    name: "Regular",
    icon: "🎓",
    description: "Attended 5 formals.",
  },
  {
    id: "formals-10",
    family: "milestone",
    metric: "formals",
    threshold: 10,
    name: "Formal Fixture",
    icon: "🔥",
    description: "Attended 10 formals.",
  },
  {
    id: "formals-25",
    family: "milestone",
    metric: "formals",
    threshold: 25,
    name: "Formal Royalty",
    icon: "👑",
    description: "Attended 25 formals.",
  },
  {
    id: "reviews-1",
    family: "milestone",
    metric: "reviews",
    threshold: 1,
    name: "First Review",
    icon: "⭐",
    description: "Posted your first public review.",
  },
  {
    id: "reviews-5",
    family: "milestone",
    metric: "reviews",
    threshold: 5,
    name: "Critic",
    icon: "📝",
    description: "Posted 5 public reviews.",
  },
  {
    id: "reviews-10",
    family: "milestone",
    metric: "reviews",
    threshold: 10,
    name: "Connoisseur",
    icon: "🏆",
    description: "Posted 10 public reviews.",
  },
];

export const COLLEGE_BADGES: CollegeBadgeDefinition[] = OXFORD_COLLEGES.map(
  (college) => ({
    id: `college-${collegeSlug(college)}`,
    family: "college",
    college,
    name: college,
    icon: COLLEGE_BADGE_ICON,
    description: `Attended a formal at ${college}.`,
  }),
);

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...MILESTONE_BADGES,
  ...COLLEGE_BADGES,
];

export const TOTAL_BADGE_COUNT = BADGE_DEFINITIONS.length;

export function badgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
