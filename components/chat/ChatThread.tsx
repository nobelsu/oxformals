"use client";

import Link from "next/link";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { GroupMembersSheet } from "@/components/chat/GroupMembersSheet";
import { MessageBody } from "@/components/chat/MessageBody";
import { ListingReferenceCard } from "@/components/chat/ListingReferenceCard";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatRelativeTime } from "@/lib/data/format";
import type { ChatMention, ConversationPreview } from "@/lib/chat/types";
import { isGroupConversation } from "@/lib/chat/types";

type Props = {
  conversation: ConversationPreview;
  onBack: () => void;
  onListingPress?: (listingId: Id<"listings">) => void;
};

export function ChatThread({ conversation, onBack, onListingPress }: Props) {
  const { user } = useAuth();
  const sendMessageMut = useMutation(api.chat.sendMessage);
  const markRead = useMutation(api.chat.markConversationRead);
  const [sending, setSending] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGroup = isGroupConversation(conversation);

  const { results, status, loadMore } = usePaginatedQuery(
    api.chat.listMessages,
    { conversationId: conversation.id },
    { initialNumItems: 40 },
  );

  const messages = useMemo(() => [...results].reverse(), [results]);
  const latestMessageAt = messages.at(-1)?.createdAt ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    void markRead({ conversationId: conversation.id });
  }, [conversation.id, latestMessageAt, markRead]);

  const defaultMentionUsers = useMemo(() => {
    if (isGroup) {
      return conversation.memberPreview.map((m) => ({
        id: m.id,
        name: m.name,
      }));
    }
    return [
      {
        id: conversation.otherUserId,
        name: conversation.otherUserName,
      },
    ];
  }, [conversation, isGroup]);

  async function handleSend(args: {
    body: string;
    mentions?: ChatMention[];
    referencedListingId?: Id<"listings">;
  }) {
    setSending(true);
    try {
      await sendMessageMut({
        conversationId: conversation.id,
        body: args.body,
        ...(args.mentions && args.mentions.length > 0
          ? { mentions: args.mentions }
          : {}),
        ...(args.referencedListingId
          ? { referencedListingId: args.referencedListingId }
          : {}),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <header className="flex items-center gap-3 border-b-[2px] border-[var(--ink)]/10 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] px-3 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Back
        </button>
        {isGroup ? (
          <button
            type="button"
            onClick={() => setMembersOpen(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate font-display text-xl uppercase tracking-wide">
              {conversation.title}
            </p>
            <p className="truncate text-sm text-[var(--ink-muted)]">
              {conversation.memberCount} members · tap to manage
            </p>
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl uppercase tracking-wide">
              {conversation.otherUserName}
            </p>
            {conversation.otherUserCollege ? (
              <p className="truncate text-sm text-[var(--ink-muted)]">
                {conversation.otherUserCollege}
              </p>
            ) : null}
          </div>
        )}
        {isGroup ? (
          <button
            type="button"
            onClick={() => setMembersOpen(true)}
            className="flex shrink-0 -space-x-1.5"
            aria-label="View group members"
          >
            {conversation.memberPreview.map((m) => (
              <Avatar key={m.id} name={m.name} size="sm" />
            ))}
            {conversation.memberCount > conversation.memberPreview.length ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] text-[0.65rem] font-medium">
                +{conversation.memberCount - conversation.memberPreview.length}
              </span>
            ) : null}
          </button>
        ) : (
          <Link
            href={`/profile/${conversation.otherUserId}`}
            className="shrink-0"
          >
            <Avatar name={conversation.otherUserName} size="md" />
          </Link>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {status === "CanLoadMore" ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => loadMore(20)}
              className="text-xs text-[var(--ink-muted)] underline underline-offset-2"
            >
              Load older messages
            </button>
          </div>
        ) : null}

        {messages.length === 0 && status !== "LoadingFirstPage" ? (
          <p className="text-center text-sm text-[var(--ink-soft)]">
            No messages yet. Say hello!
          </p>
        ) : null}

        {messages.map((msg) => {
          const isMine = user?.id === msg.senderUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-[var(--accent)] text-white"
                    : "border-[2px] border-[var(--ink)]/15 bg-[var(--paper)] text-[var(--ink)]"
                }`}
              >
                {isGroup && !isMine && msg.senderName ? (
                  <p className="mb-1 text-[0.7rem] font-medium text-[var(--ink-muted)]">
                    {msg.senderName}
                  </p>
                ) : null}
                {msg.body ? (
                  <MessageBody
                    body={msg.body}
                    mentions={msg.mentions}
                    isMine={isMine}
                  />
                ) : null}
                {msg.referencedListing ? (
                  <div className={msg.body ? "mt-2" : ""}>
                    <ListingReferenceCard
                      listing={msg.referencedListing}
                      compact
                      onPress={
                        onListingPress
                          ? () => onListingPress(msg.referencedListing!.id)
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                <p
                  className={`mt-1 text-[0.65rem] ${
                    isMine ? "text-white/70" : "text-[var(--ink-soft)]"
                  }`}
                >
                  {formatRelativeTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        conversationId={conversation.id}
        defaultMentionUsers={defaultMentionUsers}
        sending={sending}
        onSend={(args) => void handleSend(args)}
      />

      {isGroup ? (
        <GroupMembersSheet
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          conversation={conversation}
        />
      ) : null}
    </div>
  );
}
