"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import type { Conversation } from "@/lib/data/types";

type Props = {
  conversation: Conversation;
};

export function ChatThread({ conversation }: Props) {
  const { user } = useAuth();
  const { getUser, messagesFor, sendMessage } = useData();
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const messages = messagesFor(conversation.id);

  const otherId =
    user && conversation.participantIds.find((id) => id !== user.id);
  const other = otherId ? getUser(otherId) : undefined;

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    sendMessage(conversation.id, body);
    setDraft("");
  }

  if (!user) return null;

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <header className="flex items-center gap-3 border-b-[2px] border-[var(--ink)]/20 px-5 py-3">
        {other && <Avatar name={other.name} size="sm" />}
        <div className="min-w-0">
          <div className="text-[var(--ink)] truncate">
            {other?.name ?? "Unknown"}
          </div>
          {other && (
            <div className="text-xs text-[var(--ink-muted)]">
              {other.college}
            </div>
          )}
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2"
      >
        {messages.length === 0 ? (
          <div className="m-auto text-[var(--ink-muted)]">
            Say hi to get things started.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.fromUserId === user.id;
            return (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-[20px] border-[2px] border-[var(--ink)] px-3.5 py-1.5 text-sm ${
                  mine
                    ? "self-end bg-[var(--accent)] text-white"
                    : "self-start bg-[var(--bg)] text-[var(--ink)]"
                }`}
              >
                {m.body}
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={onSend}
        className="border-t-[2px] border-[var(--ink)]/20 p-3 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
