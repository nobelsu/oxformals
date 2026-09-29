"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { Modal } from "@/components/ui/Modal";
import { clearCookie, INVITE_COOKIE, readCookie, readInvite, SEAT_COOKIE } from "@/lib/invites/cookies";

/**
 * Once someone is fully signed in (profile done, rules agreed), claim the
 * invite and seat links they opened before signing in. A claimed seat link
 * lands them on the feed, where "I'm in" / "Not me" is waiting.
 */
export function InviteClaimer() {
  const router = useRouter();
  const { isAuthenticated, user, needsRulesAgreement } = useAuth();
  const claimInvite = useMutation(api.invites.claimInvite);
  const claimSeat = useMutation(api.seatLinks.claimSeatLink);
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const ready = isAuthenticated && !!user && !needsRulesAgreement;

  useEffect(() => {
    if (!ready || ran.current) return;
    ran.current = true;
    const invite = readInvite();
    const seat = readCookie(SEAT_COOKIE);
    if (!invite && !seat) return;
    void (async () => {
      if (invite) {
        try {
          await claimInvite(invite);
        } catch {
          // A bad or stale invite just does nothing.
        } finally {
          clearCookie(INVITE_COOKIE);
        }
      }
      if (seat) {
        try {
          await claimSeat({ token: seat });
          router.push("/");
        } catch (err) {
          setError(err instanceof Error ? err.message : "That link didn't work.");
        } finally {
          clearCookie(SEAT_COOKIE);
        }
      }
    })();
  }, [ready, claimInvite, claimSeat, router]);

  return (
    <Modal open={error !== null} onClose={() => setError(null)} title="Couldn't join that group" panelClassName="max-w-sm">
      <p className="text-sm text-[var(--ink-muted)]">{error}</p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setError(null)}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-1.5 text-sm font-bold text-[var(--bg)]"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
