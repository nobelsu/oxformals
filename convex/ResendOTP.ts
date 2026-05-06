import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isOxfordEmail(email: string): boolean {
  return email.endsWith("@ox.ac.uk");
}

/**
 * OTP via Resend. `Email()` defaults to id `"email"`; we override to `"resend"` so the
 * provider id matches Auth.js Resend / existing Convex deployments and the client
 * `signIn("resend", …)` call.
 * `generateVerificationToken` and `maxAge` must live on the exported object (not only
 * in `options`) so Convex Auth's sign-in implementation picks them up.
 */
const emailProvider = Email({
  sendVerificationRequest: async ({ identifier: email, token }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!isOxfordEmail(normalizedEmail)) {
      throw new Error("Only Oxford email addresses ending in @ox.ac.uk are allowed");
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new Error("AUTH_RESEND_KEY is not set");
    }
    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "FormalSwap <onboarding@resend.dev>",
      to: [normalizedEmail],
      subject: "Your FormalSwap sign-in code",
      text: `Your code is ${token}\n\nIt expires in 10 minutes.`,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});

export const ResendOTP = {
  ...emailProvider,
  id: "resend",
  maxAge: 60 * 10, // 10 minutes (seconds)
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";
    const length = 6;
    return generateRandomString(random, alphabet, length);
  },
};
