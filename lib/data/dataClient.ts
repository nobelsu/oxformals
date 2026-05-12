import { readJSON, writeJSON } from "@/lib/auth/storage";
import type {
  Conversation,
  Listing,
  Message,
} from "./types";

const K = {
  conversations: "oxformals.conversations",
  messages: "oxformals.messages",
} as const;
const LEGACY_K = {
  conversations: "formalswap.conversations",
  messages: "formalswap.messages",
} as const;

export const storageKeys = K;

function id(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${rand}`;
}

function loadConversations(): Conversation[] {
  const next = readJSON<Conversation[]>(K.conversations, []);
  if (next.length > 0) return next;
  return readJSON<Conversation[]>(LEGACY_K.conversations, []);
}
function saveConversations(v: Conversation[]): void {
  writeJSON(K.conversations, v);
}
function loadMessages(): Message[] {
  const next = readJSON<Message[]>(K.messages, []);
  if (next.length > 0) return next;
  return readJSON<Message[]>(LEGACY_K.messages, []);
}
function saveMessages(v: Message[]): void {
  writeJSON(K.messages, v);
}
/** Fields collected in the list-a-formal form (profile supplies the rest). */
export type NewListingInput = Pick<Listing, "dateTime" | "groupSize" | "message" | "menu">;

export const dataClient = {
  // Conversations & messages
  listConversations(): Conversation[] {
    return loadConversations();
  },
  conversationsFor(userId: string): Conversation[] {
    return loadConversations()
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  ensureConversation(
    userA: string,
    userB: string,
    listingId?: string,
  ): Conversation {
    const all = loadConversations();
    const existing = all.find(
      (c) =>
        c.participantIds.includes(userA) && c.participantIds.includes(userB),
    );
    if (existing) return existing;
    const convo: Conversation = {
      id: id("cv"),
      participantIds: [userA, userB],
      listingId,
      updatedAt: Date.now(),
    };
    saveConversations([convo, ...all]);
    return convo;
  },
  messagesFor(conversationId: string): Message[] {
    return loadMessages()
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
  sendMessage(conversationId: string, fromUserId: string, body: string): Message {
    const msg: Message = {
      id: id("ms"),
      conversationId,
      fromUserId,
      body,
      createdAt: Date.now(),
    };
    saveMessages([...loadMessages(), msg]);
    const convos = loadConversations().map((c) =>
      c.id === conversationId ? { ...c, updatedAt: msg.createdAt } : c,
    );
    saveConversations(convos);
    return msg;
  },

  // Test helper (not used in UI)
  _reset(): void {
    saveConversations([]);
    saveMessages([]);
  },
};
