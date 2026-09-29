"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AvatarSource } from "@/lib/auth/types";
import { clearCookie, INVITE_COOKIE, readInvite, rememberInvite } from "@/lib/invites/cookies";

/** oxformals.com/i/<code>: "[Name] invited you" and one button. */
export function InviteLanding({ code }: { code: string }) {
  const router = useRouter();
  const { status, isAuthenticated, user, needsRulesAgreement } = useAuth();
  const preview = useQuery(api.invites.getInvitePreview, { code });
  const claim = useMutation(api.invites.claimInvite);
  const [busy, setBusy] = useState(false);

  const signedIn = isAuthenticated && !!user && !needsRulesAgreement;

  // Signed out: keep the code through sign-in (InviteClaimer claims it).
  useEffect(() => {
    if (preview && status === "ready" && !signedIn) rememberInvite(code);
  }, [preview, code, status, signedIn]);

  if (preview === undefined) return null;
  if (preview === null) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <EmptyState icon="users" title="This invite link doesn't work" action={{ label: "Go to Oxformals", href: "/" }} />
      </main>
    );
  }

  const first = preview.inviter.name.split(" ")[0];
  const isOwn = signedIn && user?.id === preview.inviter._id;

  const onJoin = async () => {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const saved = readInvite();
      await claim({ code, openedAt: saved?.code === code ? saved.openedAt : Date.now() });
    } finally {
      clearCookie(INVITE_COOKIE);
      router.push(`/profile/${preview.inviter._id}`);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
      <Avatar name={preview.inviter.name} size="xl" source={preview.inviter.avatar as AvatarSource | undefined} />
      <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--ink)]">{first} invited you</h1>
      <p className="mt-2 text-[var(--ink-muted)]">
        {isOwn ? "This is your link. Send it to friends." : "Swap seats at formals across Oxford."}
      </p>
      {isOwn ? null : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onJoin()}
          className="mt-6 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-2.5 text-base font-bold text-[var(--bg)] disabled:opacity-50"
        >
          {signedIn ? `Add ${first}` : "Join Oxformals"}
        </button>
      )}
    </main>
  );
}
