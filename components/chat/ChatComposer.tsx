"use client";

import { useQuery } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  MentionComposer,
  type MentionComposerHandle,
} from "@/components/chat/MentionComposer";
import { ListingReferenceCard } from "@/components/chat/ListingReferenceCard";
import { ListingReferencePicker } from "@/components/chat/ListingReferencePicker";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatListingDate } from "@/lib/data/format";
import {
  detectListingLinkSuggestion,
  parsePastedListingLink,
  stripListingLinksFromText,
} from "@/lib/chat/listingLink";
import type { MentionParticipant } from "@/lib/chat/mentions";
import type { ChatMention } from "@/lib/chat/types";
import type { ListingSummary } from "@/lib/chat/types";

type Props = {
  conversationId: Id<"conversations">;
  defaultMentionUsers?: MentionParticipant[];
  sending: boolean;
  onSend: (args: {
    body: string;
    mentions?: ChatMention[];
    referencedListingId?: Id<"listings">;
  }) => void;
};

export function ChatComposer({
  conversationId,
  defaultMentionUsers,
  sending,
  onSend,
}: Props) {
  const [draftBody, setDraftBody] = useState("");
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [pendingRef, setPendingRef] = useState<ListingSummary | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const composerRef = useRef<MentionComposerHandle>(null);

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
    if (sending || (!body && !pendingRef)) return;
    onSend({
      body,
      ...(serialized.mentions.length > 0
        ? { mentions: serialized.mentions }
        : {}),
      ...(pendingRef ? { referencedListingId: pendingRef.id } : {}),
    });
    composerRef.current?.clear();
    setDraftBody("");
    setEditorEmpty(true);
    setPendingRef(null);
  }, [pendingRef, sending, onSend]);

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

  return (
    <>
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
            <span className="text-[var(--ink)]">{linkSuggestion.college}</span>
            {" · "}
            {formatListingDate(linkSuggestion.dateTime)}
          </span>
        </button>
      ) : null}

      {pendingRef ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ListingReferenceCard listing={pendingRef} compact />
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
          disabled={sending}
          onBodyChange={setDraftBody}
          onEmptyChange={setEditorEmpty}
          onEnter={submit}
        />
        <button
          type="submit"
          disabled={sending || (editorEmpty && !pendingRef)}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
