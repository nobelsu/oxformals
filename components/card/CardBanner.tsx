"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { Modal } from "@/components/ui/Modal";
import { CardPhotoForm } from "./CardPhotoForm";

/** The backend's refusal for accounts whose card isn't approved yet. */
const BLOCKED = "University Card is still being checked";

/** Pages with their own layout where the banner would get in the way. */
const HIDDEN_ON = ["/login", "/privacy", "/terms"];

/**
 * Browse-only notice for people who signed up without an allowed email and
 * haven't had a University Card approved yet.
 */
export function CardBanner() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const card = useQuery(api.cardChecks.myCardStatus, isAuthenticated ? {} : "skip");
  const [open, setOpen] = useState(false);
  const browseOnly = !!card && card.needsCard && !card.member;

  // Buttons that touch other people (follow, request, message…) are refused by
  // the backend until the card is approved. Many don't catch errors, so catch
  // that refusal here and open this window instead of failing silently.
  useEffect(() => {
    if (!browseOnly) return;
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "");
      if (!message.includes(BLOCKED)) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [browseOnly]);

  if (!card || !card.needsCard || card.member) return null;
  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null;

  const latest = card.latest;
  const waiting = latest?.status === "pending" || latest?.status === "needs_review";
  const rejected = latest?.status === "rejected";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-3 sm:px-6">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-3"
      >
        <p className="text-sm text-[var(--ink)]">
          {waiting
            ? "Checking your University Card. You can look around meanwhile."
            : rejected
              ? (latest.reason ?? "We couldn't accept your card.")
              : "Send a photo of your University Card to join in."}
        </p>
        {waiting ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3.5 py-1 text-[13px] font-bold text-[var(--bg)]"
          >
            {rejected ? "Send it again" : "Send a photo"}
          </button>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="University Card">
        {rejected && latest.reason ? (
          <p className="mb-4 text-sm text-[var(--danger)]">{latest.reason}</p>
        ) : null}
        {waiting ? (
          <p className="text-sm text-[var(--ink)]">
            Checking your University Card. You can join in once it&apos;s approved.
          </p>
        ) : (
          <CardPhotoForm onDone={() => setOpen(false)} />
        )}
      </Modal>
    </div>
  );
}
