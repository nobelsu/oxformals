"use client";

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { SignInResult, SignupInput, User } from "@/lib/auth/types";
import { DEFAULT_UI_FONT, migrateUiFontValue } from "@/convex/uiFont";

type Status = "hydrating" | "ready";
const ADMIN_EMAIL = "admin@ox.ac.uk";

function profileComplete(doc: Doc<"users"> | null | undefined): boolean {
  if (!doc) return false;
  return !!(
    doc.name?.trim() &&
    doc.college?.trim() &&
    doc.year?.trim() &&
    doc.role?.trim()
  );
}

function mapDocToUser(doc: Doc<"users">): User {
  return {
    id: doc._id,
    email: doc.email ?? "",
    name: doc.name ?? "",
    college: doc.college ?? "",
    year: doc.year ?? "",
    role: doc.role ?? "",
    interests: doc.interests ?? [],
    instagramHandle: doc.instagramHandle ?? "",
    whatsappPhone: doc.whatsappPhone ?? "",
    dietaryRequirements: doc.dietaryRequirements ?? "",
    uiFont: migrateUiFontValue(doc.uiFont),
    ...(doc.avatar ? { avatar: doc.avatar } : {}),
    agreedToRules: doc.agreedToRules ?? false,
  };
}

export type AuthContextValue = {
  status: Status;
  user: User | null;
  /** Convex session is valid and required profile fields are filled. */
  isAuthenticated: boolean;
  /** JWT session present but profile is incomplete (show onboarding). */
  needsOnboarding: boolean;
  /** Profile complete but user has not yet agreed to house rules. */
  needsRulesAgreement: boolean;
  /** Email from the signed-in Convex user document, when available. */
  authEmail: string | null;
  /** Step 1: send a 6-digit code to the email (Resend + Convex Auth OTP). */
  requestCode: (email: string) => Promise<SignInResult>;
  /** Step 2: verify the code and establish the session. */
  verifyCode: (email: string, code: string) => Promise<void>;
  completeSignup: (input: SignupInput) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<Omit<User, "id" | "email">>,
  ) => Promise<User | null>;
  agreeToRules: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated: jwtAuthenticated } =
    useConvexAuth();
  const { signIn: signInWithProvider, signOut: signOutAction } =
    useAuthActions();

  const convexUserDoc = useQuery(api.users.current);

  const completeOnboardingMut = useMutation(api.users.completeOnboarding);
  const patchProfileMut = useMutation(api.users.patchProfile);
  const agreeToRulesMut = useMutation(api.users.agreeToRules);

  const status: Status =
    authLoading || (jwtAuthenticated && convexUserDoc === undefined)
      ? "hydrating"
      : "ready";

  const needsOnboarding =
    status === "ready" &&
    jwtAuthenticated &&
    convexUserDoc != null &&
    !profileComplete(convexUserDoc);

  const isAuthenticated =
    jwtAuthenticated &&
    convexUserDoc != null &&
    profileComplete(convexUserDoc);

  const needsRulesAgreement =
    isAuthenticated && convexUserDoc?.agreedToRules !== true;

  const user: User | null =
    jwtAuthenticated && convexUserDoc && profileComplete(convexUserDoc)
      ? mapDocToUser(convexUserDoc)
      : null;

  const authEmail =
    jwtAuthenticated && convexUserDoc != null && convexUserDoc.email
      ? convexUserDoc.email
      : null;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!jwtAuthenticated || convexUserDoc === undefined) {
      if (!jwtAuthenticated) {
        document.documentElement.removeAttribute("data-ui-font");
      }
      return;
    }
    if (convexUserDoc === null) {
      document.documentElement.removeAttribute("data-ui-font");
      return;
    }
    document.documentElement.setAttribute(
      "data-ui-font",
      migrateUiFontValue(convexUserDoc.uiFont),
    );
  }, [jwtAuthenticated, convexUserDoc]);

  const requestCode = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      const normalizedEmail = trimmed.toLowerCase();
      const formData = new FormData();
      formData.set("email", trimmed);
      if (normalizedEmail === ADMIN_EMAIL) {
        await signInWithProvider("admin-email", formData);
        return { status: "signed-in" as const, email: normalizedEmail };
      }
      await signInWithProvider("resend", formData);
      return { status: "code-sent" as const, email: normalizedEmail };
    },
    [signInWithProvider],
  );

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      const trimmedEmail = email.trim();
      const trimmedCode = code.trim();
      const formData = new FormData();
      formData.set("email", trimmedEmail);
      formData.set("code", trimmedCode);
      await signInWithProvider("resend", formData);
    },
    [signInWithProvider],
  );

  const completeSignup = useCallback(
    async (input: SignupInput) => {
      const userId = await completeOnboardingMut({
        name: input.name,
        college: input.college,
        year: input.year,
        role: input.role,
        interests: input.interests,
        instagramHandle: input.instagramHandle,
        whatsappPhone: input.whatsappPhone,
      });
      const email = (convexUserDoc?.email ?? input.email).trim();
      return {
        id: userId,
        email,
        name: input.name.trim(),
        college: input.college.trim(),
        year: input.year.trim(),
        role: input.role.trim(),
        interests: input.interests ?? [],
        instagramHandle: input.instagramHandle?.trim() ?? "",
        whatsappPhone: input.whatsappPhone?.trim() ?? "",
        dietaryRequirements: "",
        uiFont: DEFAULT_UI_FONT,
        agreedToRules: false,
      } satisfies User;
    },
    [completeOnboardingMut, convexUserDoc?.email],
  );

  const signOut = useCallback(async () => {
    await signOutAction();
  }, [signOutAction]);

  const updateProfile = useCallback(
    async (
      patch: Partial<Omit<User, "id" | "email">>,
    ): Promise<User | null> => {
      if (!user) return null;

      const payload: {
        name?: string;
        college?: string;
        year?: string;
        role?: string;
        interests?: string[];
        instagramHandle?: string;
        whatsappPhone?: string;
        dietaryRequirements?: string;
        uiFont?: User["uiFont"];
        avatar?: User["avatar"] | null;
      } = {};

      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.college !== undefined) payload.college = patch.college;
      if (patch.year !== undefined) payload.year = patch.year;
      if (patch.role !== undefined) payload.role = patch.role;
      if (patch.interests !== undefined) payload.interests = patch.interests;
      if (patch.instagramHandle !== undefined) {
        payload.instagramHandle = patch.instagramHandle;
      }
      if (patch.whatsappPhone !== undefined) {
        payload.whatsappPhone = patch.whatsappPhone;
      }
      if (patch.dietaryRequirements !== undefined) {
        payload.dietaryRequirements = patch.dietaryRequirements;
      }
      if (patch.uiFont !== undefined) {
        payload.uiFont = patch.uiFont;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "avatar")) {
        payload.avatar = patch.avatar ?? null;
      }

      if (Object.keys(payload).length === 0) {
        return user;
      }

      await patchProfileMut(payload);

      return {
        ...user,
        ...patch,
        interests: patch.interests ?? user.interests,
        uiFont: patch.uiFont ?? user.uiFont,
        avatar: Object.prototype.hasOwnProperty.call(patch, "avatar")
          ? patch.avatar
          : user.avatar,
      };
    },
    [user, patchProfileMut],
  );

  const agreeToRules = useCallback(async () => {
    await agreeToRulesMut();
  }, [agreeToRulesMut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated,
      needsOnboarding,
      needsRulesAgreement,
      authEmail,
      requestCode,
      verifyCode,
      completeSignup,
      signOut,
      updateProfile,
      agreeToRules,
    }),
    [
      status,
      user,
      isAuthenticated,
      needsOnboarding,
      needsRulesAgreement,
      authEmail,
      requestCode,
      verifyCode,
      completeSignup,
      signOut,
      updateProfile,
      agreeToRules,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
