"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { User } from "@/lib/auth/types";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import {
  dataClient,
  type NewListingInput,
} from "@/lib/data/dataClient";
import { normalizeCollegeName } from "@/lib/data/colleges";
import type {
  Conversation,
  Listing,
  Message,
  SwapRequest,
} from "@/lib/data/types";

export type DataContextValue = {
  ready: boolean;
  users: User[];
  listings: Listing[];
  requests: SwapRequest[];
  conversations: Conversation[];
  wishlist: string[];

  getUser: (userId: string) => User | undefined;
  getListing: (listingId: string) => Listing | undefined;
  messagesFor: (conversationId: string) => Message[];

  createListing: (input: NewListingInput) => Listing | null;
  requestSwap: (args: {
    targetListingId: string;
    offeringListingId: string;
    message: string;
  }) => Promise<SwapRequest | null>;
  acceptRequest: (requestId: string) => SwapRequest | null;
  declineRequest: (requestId: string) => void;
  withdrawRequest: (requestId: string) => boolean;
  updateListing: (
    listingId: string,
    patch: { dateTime?: string; groupSize?: 2 | 3 | 4; message?: string; menu?: string },
  ) => void;
  deleteListing: (listingId: string) => void;
  leaveGroup: (listingId: string) => void;
  removeMember: (listingId: string, memberId: string) => void;
  sendMessage: (conversationId: string, body: string) => void;
  openConversationWith: (otherUserId: string, listingId?: string) => Conversation | null;
  saveWishlist: (colleges: string[]) => Promise<void>;
};

export const DataContext = createContext<DataContextValue | null>(null);

function mapUser(doc: Doc<"users">): User {
  return {
    id: doc._id,
    email: doc.email ?? "",
    name: doc.name ?? "",
    college: doc.college ?? "",
    year: doc.year ?? "",
    role: doc.role ?? "",
    interests: doc.interests ?? [],
    uiFont: doc.uiFont ?? DEFAULT_UI_FONT,
    ...(doc.instagramHandle ? { instagramHandle: doc.instagramHandle } : {}),
    ...(doc.whatsappPhone ? { whatsappPhone: doc.whatsappPhone } : {}),
    ...(doc.avatar ? { avatar: doc.avatar } : {}),
  };
}

function mapListing(doc: Doc<"listings">): Listing {
  return {
    id: doc._id,
    ownerUserId: doc.ownerUserId,
    college: doc.college,
    dateTime: doc.dateTime,
    groupSize: doc.groupSize,
    seatsAvailable: doc.seatsAvailable,
    members: doc.members,
    year: doc.year,
    role: doc.role,
    message: doc.message,
    menu: doc.menu ?? "",
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

function mapRequest(doc: Doc<"requests">): SwapRequest {
  return {
    id: doc._id,
    fromUserId: doc.fromUserId,
    toUserId: doc.toUserId,
    targetListingId: doc.targetListingId,
    offeringListingId: doc.offeringListingId,
    message: doc.message,
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const ready = authStatus === "ready";

  const convexUsers = useQuery(api.users.listPublic);
  const convexListings = useQuery(api.listings.listListings);
  const incomingRequests = useQuery(
    api.listings.listRequestsForMe,
    user ? {} : "skip",
  );
  const outgoingRequests = useQuery(
    api.listings.listRequestsFromMe,
    user ? {} : "skip",
  );
  const wishlist = useQuery(api.users.myWishlist, user ? {} : "skip");

  const createListingMut = useMutation(api.listings.createListing);
  const createRequestMut = useMutation(api.listings.createRequest);
  const acceptRequestMut = useMutation(api.listings.acceptRequest);
  const declineRequestMut = useMutation(api.listings.declineRequest);
  const withdrawRequestMut = useMutation(api.listings.withdrawRequest);
  const updateListingMut = useMutation(api.listings.updateListing);
  const deleteListingMut = useMutation(api.listings.deleteListing);
  const leaveGroupMut = useMutation(api.listings.leaveGroup);
  const removeMemberMut = useMutation(api.listings.removeMember);
  const saveWishlistMut = useMutation(api.users.saveWishlistColleges);

  const users = useMemo<User[]>(() => {
    if (!ready || convexUsers === undefined) return [];
    return convexUsers.map(mapUser);
  }, [ready, convexUsers]);

  const listings = useMemo<Listing[]>(() => {
    if (!ready || convexListings === undefined) return [];
    return convexListings.map(mapListing);
  }, [ready, convexListings]);

  const requests = useMemo<SwapRequest[]>(() => {
    if (!ready || !user || incomingRequests === undefined || outgoingRequests === undefined) {
      return [];
    }
    const byId = new Map<string, SwapRequest>();
    for (const req of [...incomingRequests, ...outgoingRequests]) {
      byId.set(req._id, mapRequest(req));
    }
    return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [ready, user, incomingRequests, outgoingRequests]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!ready) return [];
    return dataClient.listConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  const wishlistColleges = useMemo<string[]>(() => {
    if (!ready || !user || wishlist === undefined) return [];
    return wishlist;
  }, [ready, user, wishlist]);

  const getUser = useCallback(
    (userId: string) => users.find((u) => u.id === userId),
    [users],
  );

  const getListing = useCallback(
    (listingId: string) => listings.find((l) => l.id === listingId),
    [listings],
  );

  const messagesFor = useCallback(
    (conversationId: string) => {
      // Read directly so message sends reflect immediately after refresh.
      void tick;
      return dataClient.messagesFor(conversationId);
    },
    [tick],
  );

  const createListing = useCallback(
    (input: NewListingInput): Listing | null => {
      if (!user) return null;
      const college = normalizeCollegeName(user.college);
      const year = user.year.trim();
      const role = user.role.trim();
      if (!college || !year || !role) return null;
      void college;
      void year;
      void role;
      void createListingMut({
        dateTime: input.dateTime,
        groupSize: input.groupSize,
        message: input.message,
        menu: input.menu,
      });
      return {
        id: "pending",
        ownerUserId: user.id,
        college,
        dateTime: input.dateTime,
        groupSize: input.groupSize,
        seatsAvailable: input.groupSize - 1,
        members: [user.id],
        year,
        role,
        message: input.message,
        menu: input.menu,
        status: "active",
        createdAt: Date.now(),
      };
    },
    [user, createListingMut],
  );

  const requestSwap = useCallback(
    async (args: {
      targetListingId: string;
      offeringListingId: string;
      message: string;
    }): Promise<SwapRequest | null> => {
      if (!user) return null;
      const target = listings.find((l) => l.id === args.targetListingId);
      if (!target) return null;
      const result = await createRequestMut({
        targetListingId: args.targetListingId as Id<"listings">,
        offeringListingId: args.offeringListingId as Id<"listings">,
        message: args.message,
      });
      const convo = dataClient.ensureConversation(
        user.id,
        target.ownerUserId,
        args.targetListingId,
      );
      if (args.message.trim()) {
        dataClient.sendMessage(convo.id, user.id, args.message.trim());
      }
      refresh();
      return {
        id: result.requestId,
        fromUserId: user.id,
        toUserId: target.ownerUserId,
        targetListingId: args.targetListingId,
        offeringListingId: args.offeringListingId,
        message: args.message,
        status: result.autoAccepted ? "accepted" : "pending",
        createdAt: Date.now(),
      };
    },
    [user, listings, createRequestMut, refresh],
  );

  const acceptRequest = useCallback(
    (requestId: string): SwapRequest | null => {
      if (!user) return null;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") {
        return null;
      }
      void acceptRequestMut({ requestId: requestId as Id<"requests"> });
      return { ...req, status: "accepted" };
    },
    [user, requests, acceptRequestMut],
  );

  const declineRequest = useCallback(
    (requestId: string) => {
      if (!user) return;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") return;
      void declineRequestMut({ requestId: requestId as Id<"requests"> });
    },
    [user, requests, declineRequestMut],
  );

  const withdrawRequest = useCallback(
    (requestId: string): boolean => {
      if (!user) return false;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.fromUserId !== user.id || req.status !== "pending") {
        return false;
      }
      void withdrawRequestMut({ requestId: requestId as Id<"requests"> });
      return true;
    },
    [user, requests, withdrawRequestMut],
  );

  const updateListing = useCallback(
    (
      listingId: string,
      patch: { dateTime?: string; groupSize?: 2 | 3 | 4; message?: string; menu?: string },
    ) => {
      if (!user) return;
      void updateListingMut({
        listingId: listingId as Id<"listings">,
        ...(patch.dateTime !== undefined ? { dateTime: patch.dateTime } : {}),
        ...(patch.groupSize !== undefined ? { groupSize: patch.groupSize } : {}),
        ...(patch.message !== undefined ? { message: patch.message } : {}),
        ...(patch.menu !== undefined ? { menu: patch.menu } : {}),
      });
    },
    [user, updateListingMut],
  );

  const deleteListing = useCallback(
    (listingId: string) => {
      if (!user) return;
      void deleteListingMut({ listingId: listingId as Id<"listings"> });
    },
    [user, deleteListingMut],
  );

  const leaveGroup = useCallback(
    (listingId: string) => {
      if (!user) return;
      void leaveGroupMut({ listingId: listingId as Id<"listings"> });
    },
    [user, leaveGroupMut],
  );

  const removeMember = useCallback(
    (listingId: string, memberId: string) => {
      if (!user) return;
      void removeMemberMut({
        listingId: listingId as Id<"listings">,
        memberId: memberId as Id<"users">,
      });
    },
    [user, removeMemberMut],
  );

  const sendMessage = useCallback(
    (conversationId: string, body: string) => {
      if (!user || !body.trim()) return;
      dataClient.sendMessage(conversationId, user.id, body.trim());
      refresh();
    },
    [user, refresh],
  );

  const openConversationWith = useCallback(
    (otherUserId: string, listingId?: string) => {
      if (!user) return null;
      const c = dataClient.ensureConversation(user.id, otherUserId, listingId);
      refresh();
      return c;
    },
    [user, refresh],
  );

  const saveWishlist = useCallback(
    async (colleges: string[]) => {
      if (!user) return;
      await saveWishlistMut({ colleges });
    },
    [user, saveWishlistMut],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      users,
      listings,
      requests,
      conversations,
      wishlist: wishlistColleges,
      getUser,
      getListing,
      messagesFor,
      createListing,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      updateListing,
      deleteListing,
      leaveGroup,
      removeMember,
      sendMessage,
      openConversationWith,
      saveWishlist,
    }),
    [
      ready,
      users,
      listings,
      requests,
      conversations,
      wishlistColleges,
      getUser,
      getListing,
      messagesFor,
      createListing,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      updateListing,
      deleteListing,
      leaveGroup,
      removeMember,
      sendMessage,
      openConversationWith,
      saveWishlist,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
