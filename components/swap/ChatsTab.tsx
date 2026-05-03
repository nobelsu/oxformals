"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { SketchCard } from "@/components/ui/SketchCard";
import { ChatList } from "./ChatList";
import { ChatThread } from "./ChatThread";

type Props = {
  initialPeerUserId?: string | null;
};

export function ChatsTab({ initialPeerUserId }: Props) {
  const { user } = useAuth();
  const { conversations } = useData();

  const myConversations = useMemo(
    () =>
      user
        ? conversations
            .filter((c) => c.participantIds.includes(user.id))
            .sort((a, b) => b.updatedAt - a.updatedAt)
        : [],
    [conversations, user],
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (initialPeerUserId) {
      const match = myConversations.find((c) =>
        c.participantIds.includes(initialPeerUserId),
      );
      if (match) {
        setActiveId(match.id);
        return;
      }
    }
    if (!activeId && myConversations.length > 0) {
      setActiveId(myConversations[0].id);
    }
  }, [initialPeerUserId, myConversations, activeId, user]);

  if (!user) return null;

  const active = myConversations.find((c) => c.id === activeId) ?? null;

  return (
    <SketchCard
      seed={6}
      padded={false}
      className="overflow-hidden grid grid-cols-1 md:grid-cols-[20rem_1fr] min-h-[28rem]"
    >
      <aside className="border-b-[2px] md:border-b-0 md:border-r-[2px] border-[var(--ink)]/20">
        <div className="px-5 py-3 border-b-[2px] border-[var(--ink)]/20">
          <h2 className="text-xl uppercase tracking-wide">Messages</h2>
        </div>
        <ChatList activeConversationId={activeId} onSelect={setActiveId} />
      </aside>

      <section>
        {active ? (
          <ChatThread conversation={active} />
        ) : (
          <div className="h-full flex items-center justify-center p-10 text-[var(--ink-muted)]">
            No conversation selected.
          </div>
        )}
      </section>
    </SketchCard>
  );
}
