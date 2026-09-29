import { FELLOW_ROLE, roleNeedsYear } from "../../convex/roles";
import { formatYearLabel } from "./format";

export { FELLOW_ROLE, roleNeedsYear };

export const ROLE_OPTIONS = ["Undergrad", "Masters", "DPhil", FELLOW_ROLE] as const;

export type Role = (typeof ROLE_OPTIONS)[number];

/*
 * Which roles a college actually has.
 * - All Souls admits no students at all: its members are all fellows.
 * - These are graduate-only colleges (no undergraduates): Green Templeton,
 *   Kellogg, Linacre, Nuffield, Reuben, St Antony's, St Cross, Wolfson.
 * - Everyone else keeps every role. Harris Manchester takes (mature)
 *   undergraduates. The PPHs (Blackfriars, Campion Hall, Regent's Park,
 *   Wycliffe Hall) have mixed or small, shifting student bodies, so they are
 *   left open rather than guessed at.
 */
const FELLOWS_ONLY: readonly Role[] = [FELLOW_ROLE];
const GRADUATE_ROLES: readonly Role[] = ["Masters", "DPhil", FELLOW_ROLE];

const ROLES_BY_COLLEGE: Record<string, readonly Role[]> = {
  "all souls": FELLOWS_ONLY,
  "green templeton": GRADUATE_ROLES,
  kellogg: GRADUATE_ROLES,
  linacre: GRADUATE_ROLES,
  nuffield: GRADUATE_ROLES,
  reuben: GRADUATE_ROLES,
  "st antony's": GRADUATE_ROLES,
  "st cross": GRADUATE_ROLES,
  wolfson: GRADUATE_ROLES,
};

export function rolesForCollege(college: string): readonly Role[] {
  return ROLES_BY_COLLEGE[college.trim().toLowerCase()] ?? ROLE_OPTIONS;
}

/**
 * Role choices for a picker: the college's roles, with a legacy value the
 * user already has kept visible at the front.
 */
export function roleChoices(college: string, current: string): string[] {
  const allowed = [...rolesForCollege(college)];
  const role = current.trim();
  if (role && !(allowed as string[]).includes(role)) return [role, ...allowed];
  return allowed;
}

/**
 * What the role should become after the college changes: kept if still
 * allowed (or a legacy value not in ROLE_OPTIONS), auto-picked if the college
 * has only one role, cleared otherwise.
 */
export function roleAfterCollegeChange(college: string, role: string): string {
  const allowed = rolesForCollege(college) as readonly string[];
  const r = role.trim();
  if (allowed.length === 1) return allowed[0];
  if (!r) return "";
  if (allowed.includes(r)) return r;
  if (!(ROLE_OPTIONS as readonly string[]).includes(r)) return r;
  return "";
}

/** "2nd year · Undergrad", or just "Fellow" — never a dangling " · ". */
export function formatYearRole(
  year: string | null | undefined,
  role: string | null | undefined,
): string {
  const r = (role ?? "").trim();
  const y = roleNeedsYear(r) ? formatYearLabel(year) : "";
  return [y, r].filter(Boolean).join(" · ");
}
