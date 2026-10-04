
export type AvatarSource =
  | { kind: "image"; dataUrl: string }
  | { kind: "preset"; id: string };

export type User = {
  id: string;
  email: string;
  name: string;
  college: string;
  year: string;
  /** e.g. Undergraduate, Postgraduate — shown on listings when you post. */
  role: string;
  interests: string[];
  /** Free-form, moderated bio (max 150 chars). */
  bio?: string;
  instagramHandle?: string;
  whatsappPhone?: string;
  dietaryRequirements?: string;
  /**
   * Opted in to sharing dietary requirements with formal matches
   * (`users.dietaryConsentAt` is set). Sent to `patchProfile` as `dietaryConsent`.
   */
  dietaryConsent?: boolean;
  /** Degree / course subject (optional). */
  subject: string;
  avatar?: AvatarSource;
  agreedToRules?: boolean;
  /** When false, user opts out of email notifications (wishlist alerts, review reminders). */
  emailNotifications?: boolean;
};

export type Session = {
  userId: string;
  token: string;
  issuedAt: number;
};

export type SaveBioResult =
  | { ok: true }
  | { ok: false; reason: "tooLong" | "flagged" | "unavailable" };

export type SignInResult = { status: "code-sent"; email: string };

export type SignupInput = {
  email: string;
  name: string;
  college: string;
  year: string;
  role: string;
  interests?: string[];
  instagramHandle?: string;
  whatsappPhone?: string;
};
