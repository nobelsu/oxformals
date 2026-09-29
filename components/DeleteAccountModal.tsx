"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/convex/_generated/api";
import { formatListingDate } from "@/lib/data/format";
import { LoadingBlock } from "@/components/ui/Loading";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Impact = FunctionReturnType<typeof api.accountDeletion.getDeletionImpact>;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Loads the impact preview and performs the deletion. */
export function DeleteAccountModal({ open, onClose }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();
  const impact = useQuery(
    api.accountDeletion.getDeletionImpact,
    open ? {} : "skip",
  );
  const deleteMyAccount = useMutation(api.accountDeletion.deleteMyAccount);

  return (
    <DeleteAccountDialog
      open={open}
      onClose={onClose}
      impact={impact}
      onConfirm={async (confirmEmail) => {
        await deleteMyAccount({ confirmEmail });
        await signOut();
        router.push("/");
      }}
    />
  );
}

/** The confirmation screen itself; `impact` is undefined while loading. */
export function DeleteAccountDialog({
  open,
  onClose,
  impact,
  onConfirm,
}: Props & {
  impact: Impact | undefined;
  onConfirm: (confirmEmail: string) => Promise<void>;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches =
    !!impact &&
    confirmInput.trim().toLowerCase() === impact.email.toLowerCase();

  function handleClose() {
    if (busy) return;
    setConfirmInput("");
    setError(null);
    onClose();
  }

  async function onDelete() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(confirmInput);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("doesn't match")
          ? "That email doesn't match your account."
          : "Couldn't delete. Try again.",
      );
      setBusy(false);
    }
  }

  const affected = impact
    ? [
        ...impact.hosting.map(
          (h) =>
            `You're hosting ${h.college} on ${formatListingDate(h.dateTime)}${
              h.guestCount > 0 ? ` with ${plural(h.guestCount, "guest")}` : ""
            }. It will be cancelled.`,
        ),
        ...impact.joined.map(
          (j) =>
            `You're a guest at ${j.college} on ${formatListingDate(j.dateTime)}. Your seat will be freed.`,
        ),
        ...(impact.pendingRequests > 0
          ? [
              `${plural(impact.pendingRequests, "pending request")} will be declined.`,
            ]
          : []),
      ]
    : [];

  return (
    <Modal open={open} onClose={handleClose} title="Delete account">
      {impact === undefined ? (
        <LoadingBlock />
      ) : impact === null ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Sign in first.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {affected.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                This affects:
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm text-[var(--ink)]">
                {affected.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span aria-hidden>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                We&rsquo;ll email the people affected.
              </p>
            </div>
          ) : null}

          <p className="text-sm text-[var(--ink)]">
            Your profile and data go. Reviews and messages stay as
            &ldquo;Deleted user&rdquo;. This can&rsquo;t be undone.
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">
              Type{" "}
              <span className="font-semibold text-[var(--ink)]">
                {impact.email}
              </span>{" "}
              to confirm
            </span>
            <input
              type="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={busy}
              placeholder={impact.email}
              className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-4 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--danger)] disabled:opacity-60"
            />
          </label>

          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              disabled={!matches || busy}
              onClick={() => void onDelete()}
              className="w-full cursor-pointer rounded-full bg-[var(--danger)] py-2.5 text-base font-medium text-[var(--danger-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete account"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="w-full cursor-pointer rounded-full border-[2px] border-[var(--ink)] py-2.5 text-base text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
