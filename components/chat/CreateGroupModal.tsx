"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { ChatUserPickRow } from "@/components/chat/ChatUserPickRow";
import { useStartGroupChat } from "@/components/chat/useStartGroupChat";
import { useAuth } from "@/components/auth/useAuth";
import { DismissibleChip } from "@/components/ui/DismissibleChip";
import { Modal } from "@/components/ui/Modal";
import { OutlineButton } from "@/components/ui/OutlineButton";
import { OutlineTextField } from "@/components/ui/OutlineTextField";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_GROUP_SIZE } from "@/lib/chat/constants";

type SelectedMember = {
  id: Id<"users">;
  name: string;
  college?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateGroupModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<SelectedMember[]>([]);
  const { startGroup, starting } = useStartGroupChat();

  const trimmed = search.trim();
  const searchResults = useQuery(
    api.chat.searchUsersForChat,
    open && trimmed.length >= 2 ? { query: trimmed } : "skip",
  );

  function handleClose() {
    setSearch("");
    setGroupName("");
    setSelected([]);
    onClose();
  }

  const maxOthers = MAX_GROUP_SIZE - 1;
  const atCapacity = selected.length >= maxOthers;

  function addMember(member: SelectedMember) {
    if (selected.some((m) => m.id === member.id)) return;
    if (atCapacity) return;
    setSelected((prev) => [...prev, member]);
    setSearch("");
  }

  function removeMember(userId: Id<"users">) {
    setSelected((prev) => prev.filter((m) => m.id !== userId));
  }

  async function handleCreate() {
    if (!user) return;
    const memberIds = [
      ...new Set([user.id as Id<"users">, ...selected.map((m) => m.id)]),
    ];
    if (memberIds.length < 2 || memberIds.length > MAX_GROUP_SIZE) return;
    handleClose();
    await startGroup(memberIds, groupName);
  }

  const canCreate = user && selected.length >= 1;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create group"
      panelClassName="max-w-md"
    >
      <p className="text-sm text-[var(--ink-muted)]">
        Round up your crew — you&apos;re already in. Just add one more person
        to get the chat going (up to {MAX_GROUP_SIZE} people total).
      </p>

      <OutlineTextField
        label="Group name (optional)"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="e.g. Trinity formal crew"
        maxLength={80}
        className="mt-4"
      />

      {selected.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((member) => (
            <DismissibleChip
              key={member.id}
              dismissLabel={`Remove ${member.name}`}
              onDismiss={() => removeMember(member.id)}
            >
              {member.name}
            </DismissibleChip>
          ))}
        </div>
      ) : null}

      <OutlineTextField
        label="Add people"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        clearable
        placeholder="Search by name or college…"
        className="mt-4"
      />

      <div className="mt-3 max-h-[35vh] overflow-y-auto">
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
            {searchResults.map((u) => {
              const isSelected = selected.some((m) => m.id === u.id);
              const disabled = starting || isSelected || atCapacity;
              return (
                <li key={u.id}>
                  <ChatUserPickRow
                    name={u.name}
                    college={u.college}
                    selected={isSelected}
                    disabled={disabled}
                    trailing={
                      isSelected ? (
                        <span className="text-xs font-medium text-[var(--accent)]">
                          Added
                        </span>
                      ) : null
                    }
                    onClick={() =>
                      addMember({
                        id: u.id,
                        name: u.name,
                        ...(u.college ? { college: u.college } : {}),
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        {atCapacity ? (
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Group is full ({MAX_GROUP_SIZE} people max).
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <OutlineButton variant="outline" onClick={handleClose}>
          Cancel
        </OutlineButton>
        <OutlineButton
          variant="primary"
          disabled={!canCreate || starting}
          onClick={() => void handleCreate()}
          className="px-5"
        >
          Create group
        </OutlineButton>
      </div>
    </Modal>
  );
}
