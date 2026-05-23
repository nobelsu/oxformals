"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { ChatUserPickRow } from "@/components/chat/ChatUserPickRow";
import { useStartChat } from "@/components/chat/useStartChat";
import { Modal } from "@/components/ui/Modal";
import { OutlineTextField } from "@/components/ui/OutlineTextField";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function StartChatModal({ open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const { startChat, starting } = useStartChat();

  const trimmed = search.trim();
  const searchResults = useQuery(
    api.chat.searchUsersForChat,
    open && trimmed.length >= 2 ? { query: trimmed } : "skip",
  );

  function handleClose() {
    setSearch("");
    onClose();
  }

  async function selectUser(userId: Id<"users">) {
    handleClose();
    await startChat(userId);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New message"
      panelClassName="max-w-md"
    >
      <p className="text-sm text-[var(--ink-muted)]">
        Search for someone to message.
      </p>

      <OutlineTextField
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        clearable
        placeholder="Search by name or college…"
        autoFocus
        className="mt-4"
      />

      <div className="mt-4 max-h-[45vh] overflow-y-auto">
        {trimmed.length < 2 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            Type at least 2 characters to search.
          </p>
        ) : searchResults === undefined ? (
          <p className="text-sm text-[var(--ink-soft)]">Searching…</p>
        ) : searchResults.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No users found.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {searchResults.map((user) => (
              <li key={user.id}>
                <ChatUserPickRow
                  name={user.name}
                  college={user.college}
                  avatar={user.avatar}
                  disabled={starting}
                  onClick={() => void selectUser(user.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
