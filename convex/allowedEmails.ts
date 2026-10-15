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
  "stanford.edu",
];
/** Domains whose subdomains are allowed too (alumni.stanford.edu). */
const ALLOWED_WITH_SUBDOMAINS = ["stanford.edu"];

export function isAllowedEmail(raw: string | undefined | null): boolean {
  const email = (raw ?? "").trim().toLowerCase();
  if (ALLOWED_DOMAINS.some((d) => email.endsWith(`@${d}`))) return true;
  return ALLOWED_WITH_SUBDOMAINS.some((d) => email.endsWith(`.${d}`));
}
