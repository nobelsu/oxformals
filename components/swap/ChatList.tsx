"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { formatRelativeTime } from "@/lib/data/format";
import type { Conversation } from "@/lib/data/types";

type Props = {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
};

export function ChatList({ activeConversationId, onSelect }: Props) {
  const { user } = useAuth();
  const { conversations, getUser, messagesFor } = useData();

  if (!user) return null;

  const mine = conversations
    .filter((c) => c.participantIds.includes(user.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (mine.length === 0) {
    return (
      <div className="p-6 text-[var(--ink-muted)]">
        No chats yet. Request a swap to start one.
      </div>
    );
  }

  return (
    <ul className="divide-y-[2px] divide-[var(--ink)]/20">
      {mine.map((c) => (
        <ChatListItem
          key={c.id}
          conversation={c}
          currentUserId={user.id}
          getOtherName={() => {
            const otherId = c.participantIds.find((id) => id !== user.id);
            return otherId ? (getUser(otherId)?.name ?? "Unknown") : "Unknown";
          }}
          getOtherCollege={() => {
            const otherId = c.participantIds.find((id) => id !== user.id);
            return otherId ? (getUser(otherId)?.college ?? "") : "";
          }}
          preview={() => {
            const msgs = messagesFor(c.id);
            return msgs.length > 0 ? msgs[msgs.length - 1].body : "";
          }}
          isActive={activeConversationId === c.id}
          onSelect={() => onSelect(c.id)}
        />
      ))}
    </ul>
  );
}

function ChatListItem({
  conversation,
  getOtherName,
  getOtherCollege,
  preview,
  isActive,
  onSelect,
}: {
  conversation: Conversation;
  currentUserId: string;
  getOtherName: () => string;
  getOtherCollege: () => string;
  preview: () => string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const name = getOtherName();
  const college = getOtherCollege();
  const last = preview();

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
          isActive
            ? "bg-[color-mix(in_srgb,var(--accent)_40%,var(--paper))]"
            : "hover:bg-[color-mix(in_srgb,var(--ink)_6%,var(--paper))]"
        }`}
      >
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[var(--ink)] truncate">{name}</div>
            <div className="text-xs text-[var(--ink-soft)] shrink-0">
              {formatRelativeTime(conversation.updatedAt)}
            </div>
          </div>
          <div className="text-xs text-[var(--ink-muted)] truncate">
            {college ? `${college} · ` : ""}
            {last || "Say hi"}
          </div>
        </div>
      </button>
    </li>
  );
}
