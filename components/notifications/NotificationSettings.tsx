"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { api } from "@/convex/_generated/api";
import { SkeletonRows } from "@/components/ui/Loading";

const ROWS = [
  ["bookings", "Bookings", "Requests, replies and cancelled formals"],
  ["invites", "Group invites", "Invites to a group, and who has joined yours"],
  ["social", "Social", "New followers, and friends joining Oxformals"],
  ["credits", "Credits & reminders", "Credits, formal tomorrow, and new formals you want"],
] as const;

const CHANNELS = [
  ["push", "Push"],
  ["email", "Email"],
] as const;

type Category = (typeof ROWS)[number][0];

const ICONS: Record<Category, ReactNode> = {
  bookings: (
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8ZM14 6v12" />
  ),
  invites: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.5M17.5 14.5a5 5 0 0 1 3 4.5" />
    </>
  ),
  social: (
    <path d="M20.5 6a5 5 0 0 0-7.5 0l-1 1-1-1a5 5 0 0 0-7.5 7l8.5 8 8.5-8a5 5 0 0 0 0-7Z" />
  ),
  credits: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.5a2.5 2.5 0 1 0-2.5 2.5 2.5 2.5 0 1 1-2.5 2.5M12 6.5v1M12 16.5v1" />
    </>
  ),
};

/** "Push and email" / "Push only" / "Off": the card's one-line state. */
function summary(push: boolean, email: boolean): string {
  if (push && email) return "Push and email";
  if (push) return "Push only";
  if (email) return "Email only";
  return "Off";
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] transition-colors ${
        on ? "bg-[var(--ink)]" : "bg-[var(--paper)]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-transform ${
          on ? "translate-x-4 bg-[var(--paper)]" : "translate-x-0 bg-[var(--ink)]"
        }`}
      />
    </button>
  );
}

/** One card per topic: its state at a glance, opening to a switch per channel. */
export function NotificationSettings() {
  const [openId, setOpenId] = useState<Category | null>(null);
  const prefs = useQuery(api.notifications.getMyNotificationPrefs, {});
  const setPref = useMutation(api.notifications.setNotificationPref).withOptimisticUpdate(
    (store, { channel, category, enabled }) => {
      const current = store.getQuery(api.notifications.getMyNotificationPrefs, {});
      if (!current) return;
      store.setQuery(api.notifications.getMyNotificationPrefs, {}, {
        ...current,
        [channel]: { ...current[channel], [category]: enabled },
      });
    },
  );
  if (!prefs) return <SkeletonRows count={4} avatar={false} />;

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {ROWS.map(([category, label, blurb]) => {
        const open = openId === category;
        const panelId = `notif-${category}`;
        return (
          <div
            key={category}
            className="rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)]"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenId(open ? null : category)}
              className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-5 w-5"
                >
                  {ICONS[category]}
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-[0.82rem] text-[var(--ink-muted)]">
                  {open ? blurb : summary(prefs.push[category], prefs.email[category])}
                </span>
              </span>
              <ChevronDownIcon
                className={`text-[var(--ink-muted)] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              />
            </button>
            {/* Rows animate between 0fr and 1fr, so the panel slides to its own height. */}
            <div
              id={panelId}
              inert={!open}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
              <div className="border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-4">
                {CHANNELS.map(([channel, channelLabel]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between gap-4 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] py-3 first:border-t-0"
                  >
                    <span className="text-sm">{channelLabel}</span>
                    <Switch
                      on={prefs[channel][category]}
                      label={`${label} ${channelLabel.toLowerCase()}`}
                      onToggle={() =>
                        void setPref({ channel, category, enabled: !prefs[channel][category] })
                      }
                    />
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
