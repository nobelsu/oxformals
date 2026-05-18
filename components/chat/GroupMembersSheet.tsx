"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatUserPickRow } from "@/components/chat/ChatUserPickRow";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { OutlineButton } from "@/components/ui/OutlineButton";
import { OutlineTextField } from "@/components/ui/OutlineTextField";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { chatsTabUrl } from "@/lib/chat/navigation";
import type { GroupConversationPreview } from "@/lib/chat/types";

type Props = {
  open: boolean;
  onClose: () => void;
  conversation: GroupConversationPreview;
};

export function GroupMembersSheet({ open, onClose, conversation }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [addSearch, setAddSearch] = useState("");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    id: Id<"users">;
    name: string;
  } | null>(null);

  const members = useQuery(
    api.chat.listGroupMembers,
    open ? { conversationId: conversation.id } : "skip",
  );

  const addGroupMember = useMutation(api.chat.addGroupMember);
  const removeGroupMember = useMutation(api.chat.removeGroupMember);
  const leaveGroup = useMutation(api.chat.leaveGroupConversation);

  const trimmed = addSearch.trim();
  const searchResults = useQuery(
    api.chat.searchUsersForChat,
    open && conversation.isCreator && trimmed.length >= 2
      ? { query: trimmed }
      : "skip",
  );

  const memberIds = new Set(members?.map((m) => m.id) ?? []);
  const addCandidates =
    searchResults?.filter((u) => !memberIds.has(u.id)) ?? [];

  async function handleAdd(userId: Id<"users">) {
    await addGroupMember({ conversationId: conversation.id, userId });
    setAddSearch("");
  }

  async function handleRemove() {
    if (!removeTarget) return;
    await removeGroupMember({
      conversationId: conversation.id,
      userId: removeTarget.id,
    });
    setRemoveTarget(null);
  }

  async function handleLeave() {
    await leaveGroup({ conversationId: conversation.id });
    setLeaveConfirmOpen(false);
    onClose();
    router.replace(chatsTabUrl(), { scroll: false });
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Group members"
        panelClassName="max-w-md"
      >
        <p className="truncate text-sm text-[var(--ink-muted)]">
          {conversation.title} · {conversation.memberCount} people
        </p>

        <ul className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto">
          {members === undefined ? (
            <li className="text-sm text-[var(--ink-soft)]">Loading…</li>
          ) : (
            members.map((m) => {
              const isSelf = user?.id === m.id;
              const isCreator = conversation.createdByUserId === m.id;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-2.5 rounded-2xl border-[2px] border-[var(--ink)]/15 px-3 py-2"
                >
                  <Link href={`/profile/${m.id}`} onClick={onClose}>
                    <Avatar name={m.name} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${m.id}`}
                      onClick={onClose}
                      className="truncate text-sm hover:underline"
                    >
                      {m.name}
                      {isSelf ? " (you)" : ""}
                    </Link>
                    {isCreator ? (
                      <p className="text-[0.65rem] text-[var(--ink-soft)]">
                        Creator
                      </p>
                    ) : m.college ? (
                      <p className="truncate text-[0.65rem] text-[var(--ink-soft)]">
                        {m.college}
                      </p>
                    ) : null}
                  </div>
                  {conversation.isCreator && !isSelf ? (
                    <OutlineButton
                      variant="outline"
                      className="shrink-0 px-2.5 py-0.5 text-[0.65rem]"
                      onClick={() =>
                        setRemoveTarget({ id: m.id, name: m.name })
                      }
                    >
                      Remove
                    </OutlineButton>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>

        {conversation.isCreator ? (
          <div className="mt-4 border-t-[2px] border-[var(--ink)]/10 pt-4">
            <OutlineTextField
              label="Add member"
              type="search"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              onClear={() => setAddSearch("")}
              clearable
              placeholder="Search by name or college…"
            />
            {trimmed.length >= 2 && addCandidates.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {addCandidates.slice(0, 8).map((u) => (
                  <li key={u.id}>
                    <ChatUserPickRow
                      name={u.name}
                      college={u.college}
                      onClick={() => void handleAdd(u.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : trimmed.length >= 2 && searchResults !== undefined ? (
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                No more people to add.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 border-t-[2px] border-[var(--ink)]/10 pt-4">
          <OutlineButton
            variant="destructive"
            className="w-full"
            onClick={() => setLeaveConfirmOpen(true)}
          >
            Leave group
          </OutlineButton>
        </div>
      </Modal>

      <ConfirmDialog
        open={leaveConfirmOpen}
        message="Leave this group? You won't see new messages unless someone adds you back."
        variant="destructive"
        confirmLabel="Leave group"
        onConfirm={() => void handleLeave()}
        onCancel={() => setLeaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!removeTarget}
        message={
          removeTarget
            ? `Remove ${removeTarget.name} from the group?`
            : ""
        }
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={() => void handleRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
