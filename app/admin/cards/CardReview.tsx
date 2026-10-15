"use client";

import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { useConvexAuth, useMutation, useQueries, type RequestForQueries } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { REJECT_REASONS } from "@/convex/cardRules";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Loading";
import { OutlineButton } from "@/components/ui/OutlineButton";
import { OXFORD_COLLEGES } from "@/lib/data/colleges";
import { errorMessage } from "@/lib/errorMessage";

type Item = FunctionReturnType<typeof api.cardChecks.listForReview>[number];

/**
 * Cards the reader couldn't decide, oldest first. Anyone who isn't the admin
 * (the query throws for them) gets the not-found page.
 */
export function CardReview() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Skipped (no keys) until signed in; a throw comes back as an Error.
  const queries = useMemo(
    (): RequestForQueries =>
      isAuthenticated ? { list: { query: api.cardChecks.listForReview, args: {} } } : {},
    [isAuthenticated],
  );
  const list = useQueries(queries).list as Item[] | Error | undefined;

  if (isLoading) return null;
  if (!isAuthenticated || list instanceof Error) notFound();

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-[0.12em] text-[var(--ink)] sm:text-4xl">
        University Cards
      </h1>
      {list === undefined ? (
        <SkeletonRows count={3} avatar={false} />
      ) : list.length === 0 ? (
        <EmptyState icon="inbox" title="No cards waiting." />
      ) : (
        list.map((item) => <CardItem key={item.checkId} item={item} />)
      )}
    </section>
  );
}

const selectCls =
  "min-w-0 flex-1 cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--ink)] focus:outline-none";

function yesNo(value: boolean | undefined): string {
  return value === undefined ? "—" : value ? "Yes" : "No";
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-[var(--ink-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-[var(--ink)]">{value || "—"}</dd>
    </div>
  );
}

function CardItem({ item }: { item: Item }) {
  const decide = useMutation(api.cardChecks.decide);
  const [college, setCollege] = useState(item.suggestedCollege ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = item.read;

  async function run(args: { approve: true } | { approve: false }) {
    setBusy(true);
    setError(null);
    try {
      await decide(
        args.approve
          ? { checkId: item.checkId, approve: true, college }
          : { checkId: item.checkId, approve: false, reason },
      );
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <article className="space-y-4 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4 sm:p-5">
      {item.imageUrl ? (
        <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={`University Card sent by ${item.profileName ?? "a member"}`}
            className="max-h-[70vh] w-full rounded-xl border-[2px] border-[var(--ink)] bg-[var(--bg)] object-contain"
          />
        </a>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">The photo is missing.</p>
      )}

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-lg uppercase tracking-wide">On the card</h2>
          {read ? (
            <dl className="space-y-1">
              <Row label="Name" value={read.name} />
              <Row label="College" value={read.college} />
              <Row label="Expiry" value={read.expiry} />
              <Row label="Confidence" value={read.confidence} />
              <Row label="Oxford card" value={yesNo(read.isOxfordUniversityCard)} />
              <Row label="Real card" value={yesNo(read.isPhotoOfPhysicalCard)} />
              <Row label="Face photo" value={yesNo(read.hasPortraitPhoto)} />
            </dl>
          ) : (
            <p className="text-[var(--ink-muted)]">Couldn&apos;t be read.</p>
          )}
        </div>
        <div>
          <h2 className="mb-2 font-display text-lg uppercase tracking-wide">Profile</h2>
          <dl className="space-y-1">
            <Row label="Name" value={item.profileName} />
            <Row label="Email" value={item.email} />
            <Row label="College" value={item.profileCollege} />
            <Row label="Sent" value={new Date(item.createdAt).toLocaleString("en-GB")} />
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--ink)_14%,transparent)] pt-4">
        <div className="flex items-center gap-2">
          <select
            aria-label="College"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>
              Choose college
            </option>
            {OXFORD_COLLEGES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <OutlineButton
            variant="primary"
            disabled={busy || !college}
            onClick={() => void run({ approve: true })}
            className="shrink-0"
          >
            Approve
          </OutlineButton>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>
              Choose reason
            </option>
            {REJECT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <OutlineButton
            variant="destructive"
            disabled={busy || !reason}
            onClick={() => void run({ approve: false })}
            className="shrink-0"
          >
            Reject
          </OutlineButton>
        </div>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </article>
  );
}
