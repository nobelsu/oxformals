"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { chatsTabUrl } from "@/lib/chat/navigation";

export function useStartChat() {
  const router = useRouter();
  const getOrCreate = useMutation(api.chat.getOrCreateConversation);
  const [starting, setStarting] = useState(false);

  const startChat = useCallback(
    async (otherUserId: Id<"users">) => {
      setStarting(true);
      try {
        const conversationId = await getOrCreate({ otherUserId });
        router.push(chatsTabUrl(conversationId));
      } finally {
        setStarting(false);
      }
    },
    [getOrCreate, router],
  );

  return { startChat, starting };
}
