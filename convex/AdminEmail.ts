import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  createAccount,
  retrieveAccount,
} from "@convex-dev/auth/server";

const ADMIN_EMAIL = "admin@ox.ac.uk";
const ADMIN_PROVIDER_ID = "admin-email";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function getAdminAccountSecret(): string {
  const secret = process.env.AUTH_ADMIN_BYPASS_SECRET;
  if (!secret) {
    throw new Error("AUTH_ADMIN_BYPASS_SECRET is not set");
  }
  return secret;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AdminEmail = ConvexCredentials({
  id: ADMIN_PROVIDER_ID,
  crypto: {
    hashSecret: sha256,
    verifySecret: async (secret, hash) => (await sha256(secret)) === hash,
  },
  authorize: async (credentials, ctx) => {
    const rawEmail =
      typeof credentials.email === "string" ? credentials.email : "";
    const email = normalizeEmail(rawEmail);

    if (email !== ADMIN_EMAIL) {
      throw new Error("Unauthorized");
    }

    const secret = getAdminAccountSecret();

    try {
      const { user } = await retrieveAccount(ctx, {
        provider: ADMIN_PROVIDER_ID,
        account: { id: ADMIN_EMAIL, secret },
      });
      return { userId: user._id };
    } catch {
      const { user } = await createAccount(ctx, {
        provider: ADMIN_PROVIDER_ID,
        account: { id: ADMIN_EMAIL, secret },
        profile: { email: ADMIN_EMAIL },
      });
      return { userId: user._id };
    }
  },
});
