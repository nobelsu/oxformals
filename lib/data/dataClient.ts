import { readJSON, writeJSON } from "@/lib/auth/storage";
import type {
  Conversation,
  Listing,
  Message,
  SwapRequest,
  SwapRequestStatus,
  Wishlists,
} from "./types";

const K = {
  listings: "formalswap.listings",
  requests: "formalswap.requests",
  conversations: "formalswap.conversations",
  messages: "formalswap.messages",
  wishlists: "formalswap.wishlists",
  seeded: "formalswap.seeded.v1",
} as const;

export const storageKeys = K;

function id(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${rand}`;
}

function loadListings(): Listing[] {
  return readJSON<Listing[]>(K.listings, []);
}
function saveListings(v: Listing[]): void {
  writeJSON(K.listings, v);
}
function loadRequests(): SwapRequest[] {
  return readJSON<SwapRequest[]>(K.requests, []);
}
function saveRequests(v: SwapRequest[]): void {
  writeJSON(K.requests, v);
}
function loadConversations(): Conversation[] {
  return readJSON<Conversation[]>(K.conversations, []);
}
function saveConversations(v: Conversation[]): void {
  writeJSON(K.conversations, v);
}
function loadMessages(): Message[] {
  return readJSON<Message[]>(K.messages, []);
}
function saveMessages(v: Message[]): void {
  writeJSON(K.messages, v);
}
function loadWishlists(): Wishlists {
  return readJSON<Wishlists>(K.wishlists, {});
}
function saveWishlists(v: Wishlists): void {
  writeJSON(K.wishlists, v);
}

export type CreateListingInput = Omit<
  Listing,
  "id" | "ownerUserId" | "status" | "createdAt"
>;

export type CreateRequestInput = {
  fromUserId: string;
  toUserId: string;
  targetListingId: string;
  offeringListingId: string;
  message: string;
};

export const dataClient = {
  // Listings
  listListings(): Listing[] {
    return loadListings();
  },
  listingsByOwner(userId: string): Listing[] {
    return loadListings().filter((l) => l.ownerUserId === userId);
  },
  listingById(listingId: string): Listing | undefined {
    return loadListings().find((l) => l.id === listingId);
  },
  createListing(ownerUserId: string, input: CreateListingInput): Listing {
    const listing: Listing = {
      id: id("ls"),
      ownerUserId,
      status: "active",
      createdAt: Date.now(),
      ...input,
    };
    saveListings([listing, ...loadListings()]);
    return listing;
  },
  setListingStatus(listingId: string, status: Listing["status"]): void {
    const next = loadListings().map((l) =>
      l.id === listingId ? { ...l, status } : l,
    );
    saveListings(next);
  },

  // Requests
  listRequests(): SwapRequest[] {
    return loadRequests();
  },
  requestsFor(userId: string): SwapRequest[] {
    return loadRequests().filter((r) => r.toUserId === userId);
  },
  requestsFrom(userId: string): SwapRequest[] {
    return loadRequests().filter((r) => r.fromUserId === userId);
  },
  createRequest(input: CreateRequestInput): SwapRequest {
    const req: SwapRequest = {
      id: id("rq"),
      status: "pending",
      createdAt: Date.now(),
      ...input,
    };
    saveRequests([req, ...loadRequests()]);
    return req;
  },
  respondToRequest(requestId: string, status: SwapRequestStatus): void {
    const next = loadRequests().map((r) =>
      r.id === requestId ? { ...r, status } : r,
    );
    saveRequests(next);
  },

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

  // Wishlists
  getWishlist(userId: string): string[] {
    return loadWishlists()[userId] ?? [];
  },
  toggleWishlistCollege(userId: string, college: string): string[] {
    const all = loadWishlists();
    const current = all[userId] ?? [];
    const next = current.includes(college)
      ? current.filter((c) => c !== college)
      : [...current, college];
    all[userId] = next;
    saveWishlists(all);
    return next;
  },

  // Seed bookkeeping
  hasSeeded(): boolean {
    return readJSON<boolean>(K.seeded, false);
  },
  markSeeded(): void {
    writeJSON(K.seeded, true);
  },

  // Test helper (not used in UI)
  _reset(): void {
    saveListings([]);
    saveRequests([]);
    saveConversations([]);
    saveMessages([]);
    saveWishlists({});
    writeJSON(K.seeded, false);
  },
};
