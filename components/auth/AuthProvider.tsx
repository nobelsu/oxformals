"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth/authClient";
import { userStore } from "@/lib/auth/userStore";
import type { SignInResult, SignupInput, User } from "@/lib/auth/types";

type Status = "hydrating" | "ready";

export type AuthContextValue = {
  status: Status;
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<SignInResult>;
  completeSignup: (input: SignupInput) => Promise<User>;
  signOut: () => void;
  updateProfile: (patch: Partial<Omit<User, "id" | "email">>) => User | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("hydrating");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { user: hydrated } = authClient.getSession();
    setUser(hydrated);
    setStatus("ready");
  }, []);

  const signIn = useCallback(async (email: string) => {
    const result = await authClient.requestMagicLink(email);
    if (result.status === "signed-in") {
      setUser(result.user);
    }
    return result;
  }, []);

  const completeSignup = useCallback(async (input: SignupInput) => {
    const created = await authClient.completeSignup(input);
    setUser(created);
    return created;
  }, []);

  const signOut = useCallback(() => {
    authClient.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Omit<User, "id" | "email">>): User | null => {
      if (!user) return null;
      const updated = userStore.patch(user.id, patch);
      if (!updated) return null;
      setUser(updated);
      return updated;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: !!user,
      signIn,
      completeSignup,
      signOut,
      updateProfile,
    }),
    [status, user, signIn, completeSignup, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
