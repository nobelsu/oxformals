"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { chatsTabUrl } from "@/lib/chat/navigation";

type Props = {
  listingId: Id<"listings">;
  memberCount: number;
  className?: string;
};

export function ListingGroupChatButton({
  listingId,
  memberCount,
  className = "",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const existingConversationId = useQuery(api.chat.getListingGroupConversation, {
    listingId,
  });

  const getOrCreate = useMutation(api.chat.getOrCreateListingGroupChat);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const conversationId = await getOrCreate({ listingId });
      router.push(chatsTabUrl(conversationId));
    } finally {
      setLoading(false);
    }
  }, [getOrCreate, listingId, router]);

  if (memberCount < 2) return null;

  const label =
    existingConversationId === undefined
      ? "Group chat"
      : existingConversationId
        ? "Open group chat"
        : "Group chat";

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleClick()}
      className={`rounded-full border-[2px] border-[var(--ink)] px-4 py-2 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50 ${className}`}
    >
      {loading ? "Opening…" : label}
    </button>
  );
}
