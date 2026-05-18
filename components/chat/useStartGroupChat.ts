"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { chatsTabUrl } from "@/lib/chat/navigation";

export function useStartGroupChat() {
  const router = useRouter();
  const createGroup = useMutation(api.chat.createGroupConversation);
  const [starting, setStarting] = useState(false);

  const startGroup = useCallback(
    async (memberUserIds: Id<"users">[], name?: string) => {
      setStarting(true);
      try {
        const conversationId = await createGroup({
          memberUserIds,
          ...(name?.trim() ? { name: name.trim() } : {}),
        });
        router.push(chatsTabUrl(conversationId));
      } finally {
        setStarting(false);
      }
    },
    [createGroup, router],
  );

  return { startGroup, starting };
}
