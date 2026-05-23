"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChatThread } from "@/components/chat/ChatThread";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { StartChatModal } from "@/components/chat/StartChatModal";
import { UnreadBadge } from "@/components/chat/UnreadBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  SketchCard,
  seedFrom,
  sketchCardBlockyHover,
} from "@/components/ui/SketchCard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatRelativeTime } from "@/lib/data/format";
import { chatsTabUrl } from "@/lib/chat/navigation";
import { isDmConversation, isGroupConversation } from "@/lib/chat/types";

export function MessagesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const [startChatOpen, setStartChatOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [clearTargetId, setClearTargetId] = useState<Id<"conversations"> | null>(
    null,
  );
  const [clearing, setClearing] = useState(false);

  const clearConversation = useMutation(api.chat.clearConversation);
  const conversations = useQuery(api.chat.listMyConversations);
  const activeConversation = useQuery(
    api.chat.getConversation,
    conversationParam
      ? { conversationId: conversationParam as Id<"conversations"> }
      : "skip",
  );

  const openConversation = useCallback(
    (id: Id<"conversations">) => {
      router.replace(chatsTabUrl(id), { scroll: false });
    },
    [router],
  );

  const closeThread = useCallback(() => {
    router.replace(chatsTabUrl(), { scroll: false });
  }, [router]);

  const handleConfirmClear = useCallback(async () => {
    if (!clearTargetId || clearing) return;
    setClearing(true);
    try {
      await clearConversation({ conversationId: clearTargetId });
      if (conversationParam === clearTargetId) {
        router.replace(chatsTabUrl(), { scroll: false });
      }
      setClearTargetId(null);
    } finally {
      setClearing(false);
    }
  }, [clearConversation, clearTargetId, conversationParam, router]);

  useEffect(() => {
    if (!conversationParam) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [conversationParam]);

  const threadShellClassName =
    "fixed inset-x-0 bottom-0 top-[var(--app-nav-height)] z-20 flex flex-col bg-[var(--bg)] px-4 sm:px-6";

  if (conversationParam) {
    if (activeConversation === undefined) {
      return (
        <div className={`${threadShellClassName} items-center justify-center`}>
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        </div>
      );
    }
    if (activeConversation === null) {
      return (
        <div className={`${threadShellClassName} items-center justify-center`}>
          <div>
            <p className="text-sm text-[var(--ink-soft)]">
              Conversation not found.
            </p>
            <button
              type="button"
              onClick={closeThread}
              className="mt-4 text-sm underline"
            >
              Back to chats
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className={threadShellClassName}>
        <div className="mx-auto flex h-full w-full min-h-0 max-w-5xl flex-col">
          <ChatThread
            conversation={activeConversation}
            onBack={closeThread}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl uppercase tracking-wide">
            Chats
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Seat swaps, dress codes, and the inevitable plus-one debate.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="rounded-full border-[2px] border-[var(--ink)] px-5 py-2.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Create group
          </button>
          <button
            type="button"
            onClick={() => setStartChatOpen(true)}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            New message
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {conversations === undefined ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            No conversations yet. Start a new message or create a group.
          </p>
        ) : (
          conversations.map((convo) => {
            const hasUnread = convo.unreadCount > 0;
            const isGroup = isGroupConversation(convo);
            const title = isGroup ? convo.title : convo.otherUserName;
            const subtitle = isGroup
              ? `${convo.memberCount} members`
              : convo.otherUserCollege;

            return (
              <div key={convo.id} className="group w-full">
              <SketchCard
                seed={seedFrom(convo.id)}
                padded={false}
                className={`p-4 ${sketchCardBlockyHover}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => openConversation(convo.id)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <div className="flex items-start gap-3">
                    {isGroup ? (
                      <div className="flex shrink-0 -space-x-1.5">
                        {convo.memberPreview.map((m) => (
                          <Avatar
                            key={m.id}
                            name={m.name}
                            source={m.avatar}
                            size="md"
                          />
                        ))}
                        {convo.memberCount > convo.memberPreview.length ? (
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] text-xs font-medium">
                            +{convo.memberCount - convo.memberPreview.length}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <Avatar
                        name={convo.otherUserName}
                        source={convo.otherUserAvatar}
                        size="md"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`truncate font-display text-lg uppercase tracking-wide ${
                            hasUnread ? "text-[var(--ink)]" : ""
                          }`}
                        >
                          {title}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <UnreadBadge count={convo.unreadCount} />
                          <span className="text-xs text-[var(--ink-soft)]">
                            {formatRelativeTime(convo.lastMessageAt)}
                          </span>
                        </div>
                      </div>
                      {subtitle ? (
                        <p className="mt-0.5 truncate text-sm text-[var(--ink-muted)]">
                          {subtitle}
                        </p>
                      ) : null}
                      {convo.lastMessageBody ? (
                        <p
                          className={`mt-1 truncate text-sm ${
                            hasUnread
                              ? "font-medium text-[var(--ink)]"
                              : "text-[var(--ink-soft)]"
                          }`}
                        >
                          {convo.lastMessageBody}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  </button>
                  {isDmConversation(convo) ? (
                    <button
                      type="button"
                      onClick={() => setClearTargetId(convo.id)}
                      className="shrink-0 self-start text-xs text-[var(--ink-soft)] underline underline-offset-2 transition-colors hover:text-[var(--ink)]"
                      aria-label={`Clear chat with ${convo.otherUserName}`}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </SketchCard>
              </div>
            );
          })
        )}
      </div>

      <StartChatModal
        open={startChatOpen}
        onClose={() => setStartChatOpen(false)}
      />
      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
      />

      <ConfirmDialog
        open={clearTargetId !== null}
        message="Clear this chat on your side only? The other person will still see the messages. You cannot undo this from your view."
        confirmLabel="Clear"
        variant="destructive"
        onConfirm={() => void handleConfirmClear()}
        onCancel={() => {
          if (!clearing) setClearTargetId(null);
        }}
      />
    </>
  );
}
