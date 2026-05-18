import type { Id } from "@/convex/_generated/dataModel";

export function chatsTabUrl(conversationId?: Id<"conversations">): string {
  const params = new URLSearchParams();
  params.set("tab", "chats");
  if (conversationId) {
    params.set("conversation", conversationId);
  }
  return `/?${params.toString()}`;
}
