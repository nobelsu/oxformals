import type { User } from "@/lib/auth/types";

/** Shown when a user is not in the public directory cache yet. */
export function placeholderUser(userId: string): User {
  return {
    id: userId,
    email: "",
    name: "Member",
    college: "",
    year: "",
    role: "",
    interests: [],
    subject: "",
  };
}
