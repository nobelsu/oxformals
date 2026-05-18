"use client";

import { Avatar } from "@/components/ui/Avatar";

type Props = {
  name: string;
  college?: string;
  selected?: boolean;
  trailing?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function ChatUserPickRow({
  name,
  college,
  selected = false,
  trailing,
  disabled,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-2xl border-[2px] px-3 py-2.5 text-left transition-colors disabled:opacity-50",
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/10"
          : "border-transparent hover:border-[var(--ink)]/15 hover:bg-[var(--ink)]/5",
      ].join(" ")}
    >
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ink)]">{name}</p>
        {college ? (
          <p className="truncate text-xs text-[var(--ink-soft)]">{college}</p>
        ) : null}
      </div>
      {trailing}
    </button>
  );
}
