import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The one way the site says "nothing here": an icon in a rose circle, a short
 * title, at most one line, and at most one action. `compact` drops the card
 * for use inside modals and panels.
 */

const ICONS: Record<EmptyIcon, ReactNode> = {
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z" />
      <path d="M14 4v16" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5 5h14l2 8v6H3v-6z" />
    </>
  ),
  star: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M18 14.8c1.4.7 2.5 2 3 4.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
};

export type EmptyIcon =
  | "chat"
  | "ticket"
  | "inbox"
  | "star"
  | "camera"
  | "users"
  | "search"
  | "calendar";

type Action =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
  className = "",
}: {
  icon: EmptyIcon;
  title: string;
  body?: string;
  action?: Action;
  compact?: boolean;
  className?: string;
}) {
  const buttonCls =
    "mt-2 inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]";
  return (
    <div
      className={`flex flex-col items-center gap-1.5 text-center ${
        compact
          ? "px-2 py-6"
          : "rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-5 py-9"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`mb-1.5 flex items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent-wash)] text-[var(--accent-wash-ink)] ${
          compact ? "h-11 w-11" : "h-14 w-14"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={compact ? "h-5 w-5" : "h-6 w-6"}
        >
          {ICONS[icon]}
        </svg>
      </span>
      <p className="font-bold text-[var(--ink)]">{title}</p>
      {body ? <p className="max-w-[34ch] text-sm text-[var(--ink-muted)]">{body}</p> : null}
      {action ? (
        action.href ? (
          <Link href={action.href} className={buttonCls}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={buttonCls}>
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
