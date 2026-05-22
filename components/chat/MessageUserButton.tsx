"use client";

import { useAuth } from "@/components/auth/useAuth";
import { useStartChat } from "@/components/chat/useStartChat";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  otherUserId: Id<"users">;
  className?: string;
  label?: string;
  onBeforeNavigate?: () => void;
};

export function MessageUserButton({
  otherUserId,
  className,
  label = "Message",
  onBeforeNavigate,
}: Props) {
  const { user } = useAuth();
  const { startChat, starting } = useStartChat();

  if (!user || user.id === otherUserId) return null;

  return (
    <button
      type="button"
      disabled={starting}
      onClick={() => {
        onBeforeNavigate?.();
        void startChat(otherUserId);
      }}
      className={`cursor-pointer disabled:cursor-not-allowed ${
        className ??
        "rounded-full border-[2px] border-[var(--ink)] px-6 py-2.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
      }`}
    >
      {starting ? "Opening…" : label}
    </button>
  );
}
