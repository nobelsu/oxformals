import { OXFORD_COLLEGES } from "../lib/data/colleges";

/** What the model read off a card photo. */
export type CardRead = {
  isOxfordUniversityCard: boolean;
  name: string | null;
  college: string | null;
  /** YYYY-MM-DD */
  expiry: string | null;
  confidence: "high" | "medium" | "low";
  /** A camera photo of a real plastic card, not a screenshot, scan or made-up image. */
  isPhotoOfPhysicalCard?: boolean;
  /** The card carries a real photo of a person's face. */
  hasPortraitPhoto?: boolean;
};

export type CardDecision =
  | { kind: "approve"; college: string }
  | { kind: "reject"; reason: string }
  | { kind: "review" };

export const REJECT_REASONS = [
  "We couldn't read the card. Try a sharper photo in good light.",
  "That card has expired.",
  "That isn't an Oxford University Card.",
  "The name on the card doesn't match your profile.",
  "Something else was wrong. Try again or contact us.",
] as const;

const COLLEGE_NOISE = /\b(college|hall|the|of|society)\b/g;

function collegeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[.,&-]/g, " ")
    .replace(/\bst\b/g, "saint")
    .replace(COLLEGE_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The college list's own spelling for what's printed on a card, or null. */
export function matchCollege(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = collegeKey(raw);
  if (!key) return null;
  return OXFORD_COLLEGES.find((c) => collegeKey(c) === key) ?? null;
}

function words(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s'-]/g, " ")
    .split(/[\s'-]+/)
    .filter(Boolean);
}

/**
 * True when every word of the shorter name is a whole word of the longer one:
 * "Jeremy Smith" matches "Jeremy A. Smith"; "J Smith" does not.
 */
export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = words(a ?? "");
  const y = words(b ?? "");
  if (x.length === 0 || y.length === 0) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  const pool = new Set(long);
  return short.every((w) => pool.has(w));
}

/**
 * Auto-approve only a clear, current Oxford card for a known college in the
 * person's name. Obvious failures are rejected; everything else is reviewed.
 */
export function decideCard(read: CardRead, profileName: string | undefined, todayKey: string): CardDecision {
  if (!read.isOxfordUniversityCard && read.confidence === "high") {
    return { kind: "reject", reason: REJECT_REASONS[2] };
  }
  if (read.expiry && read.expiry < todayKey) {
    return { kind: "reject", reason: REJECT_REASONS[1] };
  }
  const college = matchCollege(read.college);
  if (
    read.isOxfordUniversityCard &&
    read.confidence === "high" &&
    read.isPhotoOfPhysicalCard === true &&
    read.hasPortraitPhoto === true &&
    read.expiry !== null &&
    college !== null &&
    namesMatch(read.name, profileName)
  ) {
    return { kind: "approve", college };
  }
  return { kind: "review" };
}
