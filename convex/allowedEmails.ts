/**
 * Who can sign up:
 *  - Oxford SSO addresses (exactly @ox.ac.uk, not college ones like
 *    @exeter.ox.ac.uk, so one person can't end up with two accounts) and
 *    Saïd addresses: in straight away.
 *  - Any .edu address: in, but must send a University Card before joining in
 *    (see convex/cardChecks.ts).
 *  - Anyone else: never sent a sign-in code.
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

/** Any .edu address (stanford.edu, alumni.stanford.edu, mit.edu, …). */
export function isEduEmail(raw: string | undefined | null): boolean {
  const email = (raw ?? "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1).endsWith(".edu");
}

/** Whether this address may get a sign-in code at all. */
export function canSignUp(raw: string | undefined | null): boolean {
  return isAllowedEmail(raw) || isEduEmail(raw);
}

export const SIGN_UP_REFUSED =
  "Use your Oxford SSO email (…@ox.ac.uk), a Saïd email, or a .edu email.";

/**
 * Stanford addresses (and subdomains like alumni.stanford.edu) used to count
 * as allowed. Accounts made before this keep that; newer ones need a card.
 */
export const STANFORD_NEEDS_CARD_FROM = Date.parse("2026-10-28T15:00:00Z");

export function isStanfordEmail(raw: string | undefined | null): boolean {
  const email = (raw ?? "").trim().toLowerCase();
  return email.endsWith("@stanford.edu") || email.endsWith(".stanford.edu");
}
