"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Modal } from "@/components/ui/Modal";
import { LoadingDots } from "@/components/ui/Loading";
import { errorMessage } from "@/lib/errorMessage";

export type ReportTarget =
  | { kind: "user"; userId: Id<"users"> }
  | { kind: "listing"; listingId: Id<"listings"> }
  | { kind: "comment"; commentId: Id<"feedComments"> }
  | { kind: "message"; messageId: Id<"messages"> };

type Reason = "spam" | "harassment" | "inappropriate" | "impersonation" | "other";

const REASONS: { id: Reason; label: string }[] = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate or offensive" },
  { id: "spam", label: "Spam or a scam" },
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "other", label: "Something else" },
];

const MAX_DETAILS = 500;

/** Pick a reason, optionally say more, send. The person reported isn't told. */
export function ReportModal({
  target,
  subject,
  onClose,
}: {
  /** What's being reported; null keeps the dialog closed. */
  target: ReportTarget | null;
  /** "Priya", "this comment": completes "Report …". */
  subject: string;
  onClose: () => void;
}) {
  const report = useMutation(api.reports.report);
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => {
    setReason(null);
    setDetails("");
    setError(null);
    setSent(false);
    onClose();
  };

  async function submit() {
    if (!target || !reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await report({ target, reason, ...(details.trim() ? { details } : {}) });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Couldn't send your report."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={target !== null}
      onClose={close}
      title={sent ? "Report sent" : `Report ${subject}`}
    >
      {sent ? (
        <>
          <p className="text-sm text-[var(--ink-muted)]">
            Thanks. The team will look at it. They won&apos;t be told you reported them.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={close}
              className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-[var(--ink-muted)]">What&apos;s wrong?</legend>
            {REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm transition-colors ${
                  reason === r.id
                    ? "border-[var(--ink)] bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]"
                    : "border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)]"
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  className="sr-only"
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                />
                {r.label}
              </label>
            ))}
          </fieldset>
          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Anything to add? (optional)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={MAX_DETAILS}
              rows={3}
              className="w-full rounded-[20px] border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] focus:outline-none"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!reason || busy}
              className="inline-flex min-w-[6.5rem] cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <LoadingDots /> : "Send report"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Round flag icon on someone's profile. */
export function ReportUserButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Report ${name}`}
        title="Report"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 21V4" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </svg>
      </button>
      <ReportModal
        target={open ? { kind: "user", userId: userId as Id<"users"> } : null}
        subject={name.split(" ")[0] || name}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
