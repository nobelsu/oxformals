export type User = {
  id: string;
  email: string;
  name: string;
  college: string;
  year: string;
  interests: string[];
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
  interests?: string[];
};
