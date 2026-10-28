/**
 * Email addresses that prove someone is a student on their own. Anyone else
 * can sign in, but must have a University Card approved before joining in
 * (see convex/cardChecks.ts).
 */
const ALLOWED_DOMAINS = [
  "ox.ac.uk",
  "oxford.said.edu",
  "said.ox.ac.uk",
  "said.oxford.edu",
];

export function isAllowedEmail(raw: string | undefined | null): boolean {
  const email = (raw ?? "").trim().toLowerCase();
  return ALLOWED_DOMAINS.some((d) => email.endsWith(`@${d}`));
}

/**
 * Stanford addresses (and subdomains like alumni.stanford.edu) used to count
 * as allowed. Accounts made before this keep that; newer ones need a card.
 */
export const STANFORD_NEEDS_CARD_FROM = Date.parse("2026-10-28T15:00:00Z");

export function isStanfordEmail(raw: string | undefined | null): boolean {
  const email = (raw ?? "").trim().toLowerCase();
  return email.endsWith("@stanford.edu") || email.endsWith(".stanford.edu");
}
