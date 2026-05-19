import type { UiFontId } from "@/convex/uiFont";

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
  instagramHandle?: string;
  whatsappPhone?: string;
  dietaryRequirements?: string;
  /** Degree / course subject (optional). */
  subject: string;
  /** App UI font preference; persisted on Convex `users.uiFont`. */
  uiFont: UiFontId;
  avatar?: AvatarSource;
  agreedToRules?: boolean;
  /** When false, user opts out of wishlist new-listing email alerts. */
  emailWishlistAlerts?: boolean;
};

export type Session = {
  userId: string;
  token: string;
  issuedAt: number;
};

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
