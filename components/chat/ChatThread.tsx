"use client";

import Link from "next/link";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { GroupMembersSheet } from "@/components/chat/GroupMembersSheet";
import { MessageBody } from "@/components/chat/MessageBody";
import { MessageReplyQuote } from "@/components/chat/MessageReplyQuote";
import { SwipeToReplyMessage } from "@/components/chat/SwipeToReplyMessage";
import { ListingReferenceCard } from "@/components/chat/ListingReferenceCard";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatRelativeTime } from "@/lib/data/format";
import { ListingBrowseDetailHost } from "@/components/swap/ListingBrowseDetailHost";
import type { MentionParticipant } from "@/lib/chat/mentions";
import type {
  ChatMention,
  ChatMessage,
  ConversationPreview,
  MessageReplySnapshot,
} from "@/lib/chat/types";
import { isGroupConversation } from "@/lib/chat/types";

function replySnapshotSenderLabel(
  reply: MessageReplySnapshot,
  currentUserId: string | undefined,
  participants: MentionParticipant[],
): string {
  if (currentUserId && reply.senderUserId === currentUserId) return "You";
  if (reply.senderName) return reply.senderName;
  const match = participants.find((p) => p.id === reply.senderUserId);
  return match?.name ?? "User";
}

function MessageReplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--ink-soft)] transition-[opacity,background-color,color] hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      aria-label="Reply"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
      </svg>
    </button>
  );
}

const NEAR_BOTTOM_THRESHOLD_PX = 80;

type Props = {
  conversation: ConversationPreview;
  onBack: () => void;
};

export function ChatThread({ conversation, onBack }: Props) {
  const { user } = useAuth();
  const sendMessageMut = useMutation(api.chat.sendMessage);
  const markRead = useMutation(api.chat.markConversationRead);
  const [membersOpen, setMembersOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [detailListingId, setDetailListingId] = useState<Id<"listings"> | null>(
    null,
  );
  const [showScrollDown, setShowScrollDown] = useState(false);

  const openListingDetail = useCallback((listingId: Id<"listings">) => {
    setDetailListingId(listingId);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const anchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(
    null,
  );
  const prevFirstIdRef = useRef<string | undefined>(undefined);
  const prevLastIdRef = useRef<string | undefined>(undefined);
  const prevConversationIdRef = useRef(conversation.id);

  const isGroup = isGroupConversation(conversation);

  const { results, status, loadMore } = usePaginatedQuery(
    api.chat.listMessages,
    { conversationId: conversation.id },
    { initialNumItems: 40 },
  );

  const messages = useMemo(() => [...results].reverse(), [results]);
  const latestMessageAt = messages.at(-1)?.createdAt ?? 0;
  const firstMessageId = messages[0]?.id;
  const lastMessageId = messages.at(-1)?.id;

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight <=
      NEAR_BOTTOM_THRESHOLD_PX
    );
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    isNearBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  const updateScrollDownVisibility = useCallback(() => {
    const near = isNearBottom();
    isNearBottomRef.current = near;
    setShowScrollDown(!near && messages.length > 0);
  }, [isNearBottom, messages.length]);

  const handleScroll = useCallback(() => {
    updateScrollDownVisibility();
  }, [updateScrollDownVisibility]);

  const handleLoadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      anchorRef.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
      };
    }
    loadMore(20);
  }, [loadMore]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const conversationChanged =
      prevConversationIdRef.current !== conversation.id;
    const prevFirst = prevFirstIdRef.current;
    const prevLast = prevLastIdRef.current;
    const currFirst = firstMessageId;
    const currLast = lastMessageId;

    if (conversationChanged) {
      prevConversationIdRef.current = conversation.id;
      prevFirstIdRef.current = currFirst;
      prevLastIdRef.current = currLast;
      anchorRef.current = null;
      scrollToBottom("auto");
      return;
    }

    const isInitialLoad =
      prevLastIdRef.current === undefined && currLast !== undefined;

    if (isInitialLoad) {
      scrollToBottom("auto");
      prevFirstIdRef.current = currFirst;
      prevLastIdRef.current = currLast;
      updateScrollDownVisibility();
      return;
    }

    if (anchorRef.current) {
      const anchor = anchorRef.current;
      el.scrollTop = el.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
      anchorRef.current = null;
      prevFirstIdRef.current = currFirst;
      prevLastIdRef.current = currLast;
      updateScrollDownVisibility();
      return;
    }

    const prepended =
      prevFirst !== undefined &&
      currFirst !== undefined &&
      currFirst !== prevFirst &&
      currLast === prevLast;

    if (prepended) {
      prevFirstIdRef.current = currFirst;
      prevLastIdRef.current = currLast;
      updateScrollDownVisibility();
      return;
    }

    const appended =
      prevLast !== undefined &&
      currLast !== undefined &&
      currLast !== prevLast;

    const latestMessage = messages.at(-1);
    const isOwnMessage =
      latestMessage !== undefined && latestMessage.senderUserId === user?.id;

    if (appended && (isNearBottomRef.current || isOwnMessage)) {
      scrollToBottom("auto");
    }

    prevFirstIdRef.current = currFirst;
    prevLastIdRef.current = currLast;
    updateScrollDownVisibility();
  }, [
    conversation.id,
    firstMessageId,
    lastMessageId,
    scrollToBottom,
    updateScrollDownVisibility,
    user?.id,
  ]);

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

  function handleSend(args: {
    body: string;
    mentions?: ChatMention[];
    referencedListingId?: Id<"listings">;
    replyToMessageId?: Id<"messages">;
  }) {
    isNearBottomRef.current = true;
    scrollToBottom("auto");
    void sendMessageMut({
      conversationId: conversation.id,
      body: args.body,
      ...(args.mentions && args.mentions.length > 0
        ? { mentions: args.mentions }
        : {}),
      ...(args.referencedListingId
        ? { referencedListingId: args.referencedListingId }
        : {}),
      ...(args.replyToMessageId
        ? { replyToMessageId: args.replyToMessageId }
        : {}),
    });
    setReplyTarget(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b-[2px] border-[var(--ink)]/10 bg-[var(--bg)] pb-4">
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

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scrollbar-hide h-full space-y-3 overflow-y-auto overscroll-contain py-4"
        >
          {status === "CanLoadMore" ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadOlder}
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
                id={`msg-${msg.id}`}
                className={`group flex items-center gap-1 ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                {isMine ? (
                  <MessageReplyButton onClick={() => setReplyTarget(msg)} />
                ) : null}
                <SwipeToReplyMessage onReply={() => setReplyTarget(msg)}>
                <div
                  className={`w-full rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "border-[2px] border-[var(--ink)]/15 bg-[var(--paper)] text-[var(--ink)]"
                  }`}
                >
                  {isGroup && !isMine && msg.senderName ? (
                    <p className="mb-1 text-[0.7rem] font-medium text-[var(--ink-muted)]">
                      {msg.senderName}
                    </p>
                  ) : null}
                  {msg.replyTo ? (
                    <MessageReplyQuote
                      reply={msg.replyTo}
                      senderLabel={replySnapshotSenderLabel(
                        msg.replyTo,
                        user?.id,
                        defaultMentionUsers,
                      )}
                      isMine={isMine}
                      onListingPress={
                        msg.replyTo.referencedListing
                          ? openListingDetail
                          : undefined
                      }
                    />
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
                        onPress={() => openListingDetail(msg.referencedListing!.id)}
                      />
                    </div>
                  ) : null}
                  <p
                    className={`mt-1 text-[0.65rem] ${
                      isMine
                        ? "text-[var(--accent-ink)]/70"
                        : "text-[var(--ink-soft)]"
                    }`}
                  >
                    {formatRelativeTime(msg.createdAt)}
                  </p>
                </div>
                </SwipeToReplyMessage>
                {!isMine ? (
                  <MessageReplyButton onClick={() => setReplyTarget(msg)} />
                ) : null}
              </div>
            );
          })}
        </div>

        {showScrollDown ? (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            aria-label="Scroll to latest messages"
            className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] shadow-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M6 12l6 6 6-6" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="shrink-0 bg-[var(--bg)] pb-4">
        <ChatComposer
          conversationId={conversation.id}
          defaultMentionUsers={defaultMentionUsers}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onListingPress={openListingDetail}
          onSend={(args) => void handleSend(args)}
        />
      </div>

      <ListingBrowseDetailHost
        listingId={detailListingId}
        open={!!detailListingId}
        onClose={() => setDetailListingId(null)}
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
