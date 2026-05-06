"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./useAuth";

/**
 * Full app auth (Convex session + completed profile). Users who only have a JWT
 * but still owe onboarding are not `isAuthenticated` — they are handled on `/login`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "ready" && !isAuthenticated) {
      const next = encodeURIComponent(pathname ?? "/");
      router.replace(`/login?next=${next}`);
    }
  }, [status, isAuthenticated, pathname, router]);

  if (status !== "ready" || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
