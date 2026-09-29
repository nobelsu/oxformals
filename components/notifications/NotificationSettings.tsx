"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ROWS = [
  ["bookings", "Bookings"],
  ["invites", "Group invites"],
  ["social", "Social"],
  ["credits", "Credits & reminders"],
] as const;

const CHANNELS = [
  ["push", "Push"],
  ["email", "Email"],
] as const;

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

/** Push / Email per category. No extra copy. */
export function NotificationSettings() {
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
  if (!prefs) return null;

  return (
    <div className="min-w-0 border-t border-[var(--ink-soft)] pt-5">
      <span className="text-sm text-[var(--ink-muted)]">Notifications</span>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 text-left" />
            {CHANNELS.map(([, label]) => (
              <th
                key={label}
                className="w-16 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([category, label]) => (
            <tr key={category} className="border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
              <td className="py-2.5 text-[var(--ink)]">{label}</td>
              {CHANNELS.map(([channel, channelLabel]) => (
                <td key={channel} className="py-2.5">
                  <div className="flex justify-center">
                    <Switch
                      on={prefs[channel][category]}
                      label={`${label} ${channelLabel.toLowerCase()}`}
                      onToggle={() =>
                        void setPref({ channel, category, enabled: !prefs[channel][category] })
                      }
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
