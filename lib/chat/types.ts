import type { Id } from "@/convex/_generated/dataModel";
import type { ListingType } from "@/lib/data/types";

export type ListingSummary = {
  id: Id<"listings">;
  ownerUserId: Id<"users">;
  college: string;
  dateTime: string;
  status: "active" | "confirmed" | "closed" | "expired";
  listingType?: ListingType;
  price?: number;
};

export type ChatMention = {
  userId: Id<"users">;
  label: string;
  start: number;
};

export type ChatMessage = {
  id: Id<"messages">;
  conversationId: Id<"conversations">;
  senderUserId: Id<"users">;
  senderName?: string;
  body: string;
  createdAt: number;
  referencedListing?: ListingSummary;
  mentions?: ChatMention[];
};

export type GroupMemberPreview = {
  id: Id<"users">;
  name: string;
};

export type DmConversationPreview = {
  kind: "dm";
  id: Id<"conversations">;
  otherUserId: Id<"users">;
  otherUserName: string;
  otherUserCollege?: string;
  lastMessageAt: number;
  lastMessageBody?: string;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
};

export type GroupConversationPreview = {
  kind: "group";
  id: Id<"conversations">;
  title: string;
  memberCount: number;
  memberPreview: GroupMemberPreview[];
  createdByUserId: Id<"users">;
  isCreator: boolean;
  lastMessageAt: number;
  lastMessageBody?: string;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
};

export type ConversationPreview =
  | DmConversationPreview
  | GroupConversationPreview;

export function isGroupConversation(
  convo: ConversationPreview,
): convo is GroupConversationPreview {
  return convo.kind === "group";
}

export function isDmConversation(
  convo: ConversationPreview,
): convo is DmConversationPreview {
  return convo.kind === "dm";
}
