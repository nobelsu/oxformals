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

/** OTP flows return after the Convex action accepts the send-code request (see AuthProvider). */
export type SignInResult = { status: "code-sent"; email: string };

export type SignupInput = {
  email: string;
  name: string;
  college: string;
  year: string;
  role: string;
  interests?: string[];
};
