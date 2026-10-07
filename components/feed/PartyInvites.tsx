"use client";

import { errorMessage } from "@/lib/errorMessage";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { formatListingDate, formatPrice } from "@/lib/data/format";
import type { AvatarSource } from "@/lib/auth/types";

/**
 * Group requests a friend has named you in: "I'm in" or "Not me". Hidden
 * when there are none.
 */
export function PartyInvites() {
  const invites = useQuery(api.partyInvites.listMyPartyInvites, {});
  const respond = useMutation(api.partyInvites.respondToPartyInvite);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!invites || invites.length === 0) return null;

  const answer = async (requestId: Id<"requests">, response: "in" | "out") => {
    setBusy(requestId);
    setErrors((e) => ({ ...e, [requestId]: "" }));
    try {
      await respond({ requestId, response });
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [requestId]: errorMessage(err, "Couldn't send that."),
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Group requests you're in" className="flex flex-col gap-2">
      {invites.map((inv) => {
        const from = inv.from.name?.split(" ")[0] ?? "A friend";
        const cost = inv.paysOwn
          ? inv.method === "credit"
            ? "You pay 1 spoon"
            : inv.price !== null
              ? `You pay ${formatPrice(inv.price)}`
              : "You pay the host"
          : `${from} is covering you`;
        return (
          <div
            key={inv.requestId}
            className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] p-4 shadow-[3px_3px_0_var(--ink)]"
          >
            <div className="flex items-start gap-3">
              <Avatar
                name={inv.from.name ?? from}
                size="sm"
                source={inv.from.avatar as AvatarSource | undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-bold">{from}</span> wants to bring you to{" "}
                  <span className="font-bold">{inv.college}</span>
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {formatListingDate(inv.dateTime)} · {inv.seats} seats · {cost}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {inv.response === "in" ? (
                <span className="text-sm font-bold">You&apos;re in. Waiting on the host.</span>
              ) : (
                <button
                  type="button"
                  disabled={busy === inv.requestId}
                  onClick={() => void answer(inv.requestId, "in")}
                  className="cursor-pointer rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  I&apos;m in
                </button>
              )}
              <button
                type="button"
                disabled={busy === inv.requestId}
                onClick={() => void answer(inv.requestId, "out")}
                className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1 text-sm text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
              >
                Not me
              </button>
            </div>
            {errors[inv.requestId] ? (
              <p className="mt-2 text-xs text-[var(--danger)]">{errors[inv.requestId]}</p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
