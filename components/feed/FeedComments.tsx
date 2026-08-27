"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { mapUser } from "@/lib/data/mapConvex";
import { formatRelativeTime } from "@/lib/data/format";
import { MAX_FEED_COMMENT_LENGTH } from "@/lib/data/feed";

/** Inline comment thread for one feed item, keyed by its stable `targetKey`. */
export function FeedComments({ targetKey }: { targetKey: string }) {
  const comments = useQuery(api.feedComments.listComments, { targetKey });
  const addComment = useMutation(api.feedComments.addComment);
  const deleteComment = useMutation(api.feedComments.deleteComment);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await addComment({ targetKey, text: trimmed });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2.5 border-t border-[var(--ink)]/10 pt-2.5">
      {comments === undefined ? (
        <p className="text-[0.8rem] text-[var(--ink-muted)]">Loading…</p>
      ) : comments.length === 0 ? null : (
        <ul className="flex flex-col gap-2.5">
          {comments.map((comment) => {
            const author = comment.author ? mapUser(comment.author) : null;
            const first = author?.name?.split(" ")[0] ?? "Someone";
            return (
              <li key={comment.id} className="flex items-start gap-2">
                <Avatar name={author?.name ?? "?"} size="sm" source={author?.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-[0.85rem] font-semibold">{first}</span>
                    <span className="text-[0.7rem] text-[var(--ink-muted)]">
                      {formatRelativeTime(comment.ts)}
                    </span>
                  </p>
                  <p className="break-words text-pretty text-[0.9rem] text-[var(--ink-muted)]">
                    {comment.text}
                  </p>
                </div>
                {comment.isMine ? (
                  <button
                    type="button"
                    onClick={() =>
                      void deleteComment({
                        commentId: comment.id as Id<"feedComments">,
                      })
                    }
                    className="shrink-0 text-[0.7rem] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          maxLength={MAX_FEED_COMMENT_LENGTH}
          placeholder="Add a comment…"
          className="min-w-0 flex-1 rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--bg)] px-3.5 py-1.5 text-[0.9rem] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent-hover)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-1.5 text-[0.85rem] font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}
