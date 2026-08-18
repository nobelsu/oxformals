"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MentionComposer,
  type MentionComposerHandle,
} from "@/components/chat/MentionComposer";
import { ListingReferenceCard } from "@/components/chat/ListingReferenceCard";
import { ListingReferencePicker } from "@/components/chat/ListingReferencePicker";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatListingDate, formatListingStatusLabel } from "@/lib/data/format";
import {
  detectListingLinkSuggestion,
  parsePastedListingLink,
  stripListingLinksFromText,
} from "@/lib/chat/listingLink";
import type { MentionParticipant } from "@/lib/chat/mentions";
import { MessageReplyQuote } from "@/components/chat/MessageReplyQuote";
import { useAuth } from "@/components/auth/useAuth";
import type { ChatMention, ChatMessage } from "@/lib/chat/types";
import type { ListingSummary } from "@/lib/chat/types";

type Props = {
  conversationId: Id<"conversations">;
  defaultMentionUsers?: MentionParticipant[];
  replyTarget?: ChatMessage | null;
  onCancelReply?: () => void;
  onListingPress?: (listingId: Id<"listings">) => void;
  onSend: (args: {
    body: string;
    mentions?: ChatMention[];
    referencedListingId?: Id<"listings">;
    replyToMessageId?: Id<"messages">;
  }) => void;
};

function replySenderLabel(
  msg: ChatMessage,
  currentUserId: string | undefined,
  participants: MentionParticipant[],
): string {
  if (currentUserId && msg.senderUserId === currentUserId) return "You";
  if (msg.senderName) return msg.senderName;
  const match = participants.find((p) => p.id === msg.senderUserId);
  return match?.name ?? "User";
}

export function ChatComposer({
  conversationId,
  defaultMentionUsers,
  replyTarget,
  onCancelReply,
  onListingPress,
  onSend,
}: Props) {
  const { user } = useAuth();
  const [draftBody, setDraftBody] = useState("");
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [pendingRef, setPendingRef] = useState<ListingSummary | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const composerRef = useRef<MentionComposerHandle>(null);

  // Focus when opening or switching a conversation.
  useEffect(() => {
    composerRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    if (replyTarget) {
      composerRef.current?.focus();
    }
  }, [replyTarget]);

  const referableListings = useQuery(api.chat.listReferableListings, {
    conversationId,
  });

  const referableById = useMemo(() => {
    const map = new Map<string, ListingSummary>();
    for (const listing of referableListings ?? []) {
      map.set(listing.id, listing);
    }
    return map;
  }, [referableListings]);

  const linkSuggestion = useMemo(() => {
    if (pendingRef) return null;
    return detectListingLinkSuggestion(draftBody, referableById);
  }, [draftBody, pendingRef, referableById]);

  const acceptLinkSuggestion = useCallback(() => {
    if (!linkSuggestion) return;
    setPendingRef(linkSuggestion);
    const next = stripListingLinksFromText(draftBody);
    composerRef.current?.setPlainText(next);
    setDraftBody(next);
    composerRef.current?.focus();
  }, [linkSuggestion, draftBody]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData("text");
      if (!pasted.trim()) return;

      const parsed = parsePastedListingLink(pasted, referableById);
      if (!parsed) return;

      e.preventDefault();
      setPendingRef(parsed.listing);

      const currentBody = composerRef.current?.serialize().body ?? draftBody;
      const combined = [currentBody, parsed.remainingText]
        .filter(Boolean)
        .join(" ");
      const next = stripListingLinksFromText(combined);
      composerRef.current?.setPlainText(next);
      setDraftBody(next);
    },
    [draftBody, referableById],
  );

  const submit = useCallback(() => {
    const serialized = composerRef.current?.serialize() ?? {
      body: "",
      mentions: [],
    };
    const body = serialized.body.trim();
    if (!body && !pendingRef) return;
    onSend({
      body,
      ...(serialized.mentions.length > 0
        ? { mentions: serialized.mentions }
        : {}),
      ...(pendingRef ? { referencedListingId: pendingRef.id } : {}),
      ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}),
    });
    composerRef.current?.clear();
    setDraftBody("");
    setEditorEmpty(true);
    setPendingRef(null);
    onCancelReply?.();
    composerRef.current?.focus();
  }, [pendingRef, replyTarget, onSend, onCancelReply]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab" && e.shiftKey && linkSuggestion && !pendingRef) {
        e.preventDefault();
        acceptLinkSuggestion();
      }
    },
    [linkSuggestion, pendingRef, acceptLinkSuggestion],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  const replyPreview = replyTarget
    ? {
        id: replyTarget.id,
        senderUserId: replyTarget.senderUserId,
        senderName: replyTarget.senderName,
        body: replyTarget.body,
        ...(replyTarget.referencedListing
          ? { referencedListing: replyTarget.referencedListing }
          : {}),
      }
    : null;

  return (
    <>
      {replyPreview ? (
        <MessageReplyQuote
          reply={replyPreview}
          senderLabel={replySenderLabel(
            replyTarget!,
            user?.id,
            defaultMentionUsers ?? [],
          )}
          variant="composer"
          onListingPress={
            replyTarget?.referencedListing ? onListingPress : undefined
          }
          onCancel={onCancelReply}
        />
      ) : null}

      {linkSuggestion && !pendingRef ? (
        <button
          type="button"
          onClick={acceptLinkSuggestion}
          className="mb-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--ink)]/25 bg-[var(--paper)] px-3 py-2 text-left text-xs text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)]/40 hover:bg-[var(--ink)]/5"
        >
          <span className="shrink-0 rounded bg-[var(--ink)]/10 px-1.5 py-0.5 font-mono text-[0.65rem] text-[var(--ink)]">
            ⇧ Tab
          </span>
          <span>
            Attach{" "}
            <span className="text-[var(--ink)]">
              {linkSuggestion.ownerName}&apos;s {linkSuggestion.college}
            </span>
            {" · "}
            {formatListingDate(linkSuggestion.dateTime)}
            {" · "}
            {formatListingStatusLabel(
              linkSuggestion.status,
              linkSuggestion.seatsAvailable,
            )}
          </span>
        </button>
      ) : null}

      {pendingRef ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ListingReferenceCard
              listing={pendingRef}
              compact
              onPress={
                onListingPress
                  ? () => onListingPress(pendingRef.id)
                  : undefined
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setPendingRef(null)}
            className="shrink-0 text-xs text-[var(--ink-muted)] underline"
          >
            Remove
          </button>
        </div>
      ) : null}

      <form
        className="flex shrink-0 items-end gap-2 border-t-[2px] border-[var(--ink)]/10 pt-4"
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          aria-label="Attach listing"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <MentionComposer
          ref={composerRef}
          defaultMentionUsers={defaultMentionUsers}
          placeholder="@ to mention someone"
          onBodyChange={setDraftBody}
          onEmptyChange={setEditorEmpty}
          onEnter={submit}
        />
        <button
          type="submit"
          disabled={editorEmpty && !pendingRef}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <ListingReferencePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        conversationId={conversationId}
        onSelect={setPendingRef}
      />
    </>
  );
}
