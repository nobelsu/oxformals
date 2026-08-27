"use client";

import { useState } from "react";

export const HOUSE_RULES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Be respectful",
    body: "Be respectful and courteous to everyone you interact with.",
  },
  {
    title: "Real Oxford email",
    body: "Only use your real Oxford email — no impersonation.",
  },
  {
    title: "Honour swaps",
    body: "Honour confirmed swaps. Don't ghost after accepting a request.",
  },
  {
    title: "Honest listings",
    body: "Don't create fake or duplicate listings.",
  },
  {
    title: "Follow up",
    body: "Reach out to your swap partner promptly after a match is confirmed.",
  },
  {
    title: "Report issues",
    body: "Report any issues or inappropriate behaviour to the team.",
  },
];

type Props = {
  agreed: boolean;
  onToggle: () => void;
};

export function RulesSlide({ agreed, onToggle }: Props) {
  const [read, setRead] = useState<Set<number>>(() => new Set());
  const [expanded, setExpanded] = useState<number | null>(null);

  function onRuleClick(index: number) {
    setRead((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setExpanded((current) => (current === index ? null : index));
  }

  const readCount = read.size;

  return (
    <div className="flex w-full flex-col items-center text-center gap-4">
      <div>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          House Rules
        </h2>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          {readCount} of {HOUSE_RULES.length} read
        </p>
      </div>

      <ul className="w-full max-w-sm space-y-2">
        {HOUSE_RULES.map((rule, i) => {
          const isRead = read.has(i);
          const isOpen = expanded === i;
          return (
            <li key={rule.title}>
              <button
                type="button"
                onClick={() => onRuleClick(i)}
                aria-expanded={isOpen}
                className={`flex w-full items-start gap-2.5 rounded-xl border-[2px] px-3 py-2.5 text-left transition-[border-color,background-color] duration-200 motion-reduce:transition-none active:scale-[0.99] motion-reduce:active:scale-100 ${
                  isRead
                    ? "border-[var(--accent)]/70 bg-[color-mix(in_srgb,var(--accent)_10%,var(--paper))]"
                    : "border-[var(--ink)]/20 bg-[var(--bg)]/30 hover:border-[var(--ink)]/45"
                }`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current text-[var(--accent)]">
                  {isRead ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                      <path
                        d="M2.5 6 L5 8.5 L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  ) : (
                    <span className="text-[0.65rem] font-semibold">{i + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--ink)]">
                    {rule.title}
                  </span>
                  {isOpen ? (
                    <span className="mt-1 block text-sm leading-relaxed text-[var(--ink-muted)]">
                      {rule.body}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <label className="mt-1 flex items-center gap-3 cursor-pointer select-none">
        <span className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={agreed}
            onChange={onToggle}
            className="peer sr-only"
          />
          <span className="flex h-6 w-6 items-center justify-center rounded-md border-[2px] border-[var(--ink)] bg-[var(--paper)] transition-colors peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/50">
            {agreed ? (
              <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-[var(--accent-ink)]">
                <path
                  d="M2.5 6 L5 8.5 L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            ) : null}
          </span>
        </span>
        <span className="text-sm text-[var(--ink)]">I agree to the house rules</span>
      </label>
    </div>
  );
}
