"use client";

import { useConfirm } from "@/components/ui/useConfirm";
import { errorMessage } from "@/lib/errorMessage";
import { useState, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, LoadingDots } from "@/components/ui/Loading";

const NIGHTS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type Gowns = "yes" | "no" | "sometimes";
type Dress = "smart" | "suit" | "blackTie" | "casual";
const GOWNS: { id: Gowns; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "sometimes", label: "Sometimes" },
  { id: "no", label: "No" },
];
const DRESS: { id: Dress; label: string }[] = [
  { id: "smart", label: "Smart" },
  { id: "suit", label: "Suit & tie" },
  { id: "blackTie", label: "Black tie" },
  { id: "casual", label: "Casual" },
];
const MAX_TIP = 140;

const Icon = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const MoonIcon = () => <Icon d={<path d="M19 14a7 7 0 1 1-8-10 6 6 0 0 0 8 10z" />} />;
const GownIcon = () => <Icon d={<><path d="M8 3h8l3 18H5z" /><path d="M8 3l4 5 4-5" /></>} />;
const PoundIcon = () => <Icon d={<path d="M16 6.5A4 4 0 0 0 9 9v11M6 13h8M6 20h12" />} />;
const TieIcon = () => <Icon d={<><path d="M10 3h4l-1 3h-2z" /><path d="M11 6l-2 9 3 4 3-4-2-9" /></>} />;
const PenIcon = () => <Icon d={<path d="M16 3l5 5L8 21H3v-5z" />} />;

const chip = (on: boolean) =>
  `cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] px-3 py-1.5 text-sm transition-colors ${
    on ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
  }`;

export function CollegeGuide({ college }: { college: string }) {
  const data = useQuery(api.collegeGuide.getGuide, { college });
  const deleteTip = useMutation(api.collegeGuide.deleteTip);
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [tipping, setTipping] = useState(false);

  if (data === undefined) return <Skeleton className="h-36 w-full rounded-[18px]" />;
  const { guide, tips, canEdit } = data;

  const facts = guide
    ? [
        { icon: <MoonIcon />, label: "Formal nights", value: guide.formalNights.length ? guide.formalNights.join(", ") : "–" },
        { icon: <GownIcon />, label: "Gowns", value: GOWNS.find((g) => g.id === guide.gowns)?.label ?? "–" },
        { icon: <PoundIcon />, label: "Guest price", value: guide.guestPrice !== null ? `~£${guide.guestPrice}` : "–" },
        { icon: <TieIcon />, label: "Dress code", value: DRESS.find((d) => d.id === guide.dressCode)?.label ?? "–" },
      ]
    : null;

  return (
    <div className="flex flex-col gap-2.5">
      {dialog}
      {facts ? (
        <div className="grid grid-cols-2 overflow-hidden rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)]">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`flex flex-col gap-1 px-4 py-3 ${i % 2 ? "border-l-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)]" : ""} ${i > 1 ? "border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)]" : ""}`}
            >
              <span className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                {f.icon}
                {f.label}
              </span>
              <span className="font-bold">{f.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]">
            <PenIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">No guide yet</span>
            <span className="block text-xs text-[var(--ink-muted)]">
              {canEdit ? "Fill it in for guests." : `${college} students can fill it in.`}
            </span>
          </span>
          {canEdit ? (
            <button type="button" onClick={() => setEditing(true)} className={chip(false)}>
              Start it
            </button>
          ) : null}
        </div>
      )}

      {tips.map((tip) => (
        <figure key={tip.id} className="rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-3">
          <blockquote className="text-[0.95rem]">&ldquo;{tip.text}&rdquo;</blockquote>
          <figcaption className="mt-1.5 flex items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
            <span>{tip.authorFirstName}, a {college} student</span>
            {tip.mine ? (
              <button
                type="button"
                onClick={() =>
                  confirm("Remove your tip?", "Remove", () =>
                    deleteTip({ tipId: tip.id as Id<"collegeTips"> }).then(() => undefined),
                  )
                }
                className="cursor-pointer hover:text-[var(--ink)]"
              >
                Remove
              </button>
            ) : null}
          </figcaption>
        </figure>
      ))}

      {canEdit && (guide || tips.length > 0) ? (
        <div className="flex gap-4 px-1 text-sm font-bold text-[var(--accent)]">
          <button type="button" onClick={() => setEditing(true)} className="cursor-pointer hover:underline">
            Edit guide
          </button>
          <button type="button" onClick={() => setTipping(true)} className="cursor-pointer hover:underline">
            Add a tip
          </button>
        </div>
      ) : null}

      {editing ? (
        <GuideEditor
          college={college}
          initial={guide}
          onClose={() => setEditing(false)}
          onAddTip={() => {
            setEditing(false);
            setTipping(true);
          }}
        />
      ) : null}
      {tipping ? <TipEditor college={college} onClose={() => setTipping(false)} /> : null}
    </div>
  );
}

function GuideEditor({
  college,
  initial,
  onClose,
  onAddTip,
}: {
  college: string;
  initial: { formalNights: string[]; gowns: Gowns | null; guestPrice: number | null; dressCode: Dress | null } | null;
  onClose: () => void;
  onAddTip: () => void;
}) {
  const save = useMutation(api.collegeGuide.updateGuide);
  const [nights, setNights] = useState<string[]>(initial?.formalNights ?? []);
  const [gowns, setGowns] = useState<Gowns | null>(initial?.gowns ?? null);
  const [price, setPrice] = useState(initial?.guestPrice !== null && initial?.guestPrice !== undefined ? String(initial.guestPrice) : "");
  const [dress, setDress] = useState<Dress | null>(initial?.dressCode ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal open onClose={onClose} title={`${college} guide`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Formal nights</span>
          <div className="flex flex-wrap gap-2">
            {NIGHTS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={nights.includes(n)}
                onClick={() => setNights((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]))}
                className={chip(nights.includes(n))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Gowns</span>
          <div className="flex flex-wrap gap-2">
            {GOWNS.map((g) => (
              <button key={g.id} type="button" aria-pressed={gowns === g.id} onClick={() => setGowns(g.id)} className={chip(gowns === g.id)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Guest price (£)</span>
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="14"
            className="w-28 rounded-xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_16%,transparent)] bg-[var(--bg)] px-3 py-2 text-base focus:border-[var(--ink)] focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">Dress code</span>
          <div className="flex flex-wrap gap-2">
            {DRESS.map((d) => (
              <button key={d.id} type="button" aria-pressed={dress === d.id} onClick={() => setDress(d.id)} className={chip(dress === d.id)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onAddTip} className="cursor-pointer text-sm font-bold text-[var(--accent)] hover:underline">
            Add a tip instead
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await save({
                  college,
                  formalNights: nights,
                  ...(gowns ? { gowns } : {}),
                  ...(price ? { guestPrice: Number(price) } : {}),
                  ...(dress ? { dressCode: dress } : {}),
                });
                onClose();
              } catch (err) {
                setError(errorMessage(err, "Couldn't save that."));
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex min-w-[5.5rem] cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {busy ? <LoadingDots /> : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TipEditor({ college, onClose }: { college: string; onClose: () => void }) {
  const addTip = useAction(api.collegeGuide.addTip);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const REASONS: Record<string, string> = {
    tooLong: `Keep it under ${MAX_TIP} characters.`,
    empty: "Write a tip first.",
    flagged: "That tip can't be posted. Try rewording it.",
    unavailable: "Couldn't check that. Try again.",
  };
  return (
    <Modal open onClose={onClose} title="Add a tip">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between text-xs text-[var(--ink-muted)]">
          <span className="font-semibold">For guests coming to {college}</span>
          <span>
            {text.length} / {MAX_TIP}
          </span>
        </div>
        <textarea
          value={text}
          maxLength={MAX_TIP}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          rows={3}
          placeholder="Sunday is the one to get."
          className="w-full rounded-xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_16%,transparent)] bg-[var(--bg)] px-3 py-2.5 text-base focus:border-[var(--ink)] focus:outline-none"
        />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await addTip({ college, text });
                if (res.ok) onClose();
                else setError(REASONS[res.reason] ?? "Couldn't post that.");
              } catch (err) {
                setError(errorMessage(err, "Couldn't post that."));
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex min-w-[5.5rem] cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {busy ? <LoadingDots /> : "Post tip"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
