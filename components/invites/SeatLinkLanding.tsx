"use client";

import { errorMessage } from "@/lib/errorMessage";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formalWhen } from "@/convex/notificationCopy";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AvatarSource } from "@/lib/auth/types";
import { rememberSeatLink } from "@/lib/invites/cookies";

/** oxformals.com/s/<token>: the formal, the host, who invited you, and "Join to answer". */
export function SeatLinkLanding({ token }: { token: string }) {
  const router = useRouter();
  const { isAuthenticated, user, needsRulesAgreement } = useAuth();
  const preview = useQuery(api.seatLinks.getSeatLinkPreview, { token });
  const claim = useMutation(api.seatLinks.claimSeatLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (preview === undefined) return null;
  if (preview === null || preview.state !== "open") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <EmptyState
          icon="ticket"
          title={
            preview?.state === "used"
              ? "Someone already took this seat"
              : preview?.state === "closed"
                ? "This request is closed"
                : "This link has expired"
          }
          action={{ label: "Browse formals", href: "/?tab=browse" }}
        />
      </main>
    );
  }

  const signedIn = isAuthenticated && !!user && !needsRulesAgreement;

  const onJoin = async () => {
    if (!signedIn) {
      rememberSeatLink(token);
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await claim({ token });
      router.push("/");
    } catch (err) {
      setError(errorMessage(err, "That didn't work."));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
      <Avatar name={preview.from.name} size="xl" source={preview.from.avatar as AvatarSource | undefined} />
      <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--ink)]">
        {preview.from.name} saved you a seat
      </h1>
      <div className="mt-5 w-full rounded-[18px] border-[2px] border-[var(--ink)] bg-[var(--paper)] px-5 py-4 text-left">
        <p className="font-display text-2xl uppercase leading-none tracking-wide">{preview.college}</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{formalWhen(preview.dateTime)}</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Hosted by {preview.host.name}</p>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void onJoin()}
        className="mt-6 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-2.5 text-base font-bold text-[var(--bg)] disabled:opacity-50"
      >
        {signedIn ? "Answer" : "Join to answer"}
      </button>
      {!signedIn ? (
        <button
          type="button"
          onClick={() => {
            rememberSeatLink(token);
            router.push("/login");
          }}
          className="mt-3 cursor-pointer text-sm text-[var(--ink-muted)] underline underline-offset-2"
        >
          I already have an account
        </button>
      ) : null}
    </main>
  );
}
