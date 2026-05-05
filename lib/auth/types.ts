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
  avatar?: AvatarSource;
};

export type Session = {
  userId: string;
  token: string;
  issuedAt: number;
};

export type SignInResult =
  | { status: "signed-in"; user: User }
  | { status: "needs-profile"; email: string };

export type SignupInput = {
  email: string;
  name: string;
  college: string;
  year: string;
  role: string;
  interests?: string[];
};
