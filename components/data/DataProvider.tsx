"use client";

import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { User } from "@/lib/auth/types";
import { type NewListingInput } from "@/lib/data/dataClient";
import { normalizeCollegeName } from "@/lib/data/colleges";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import type {
  FormalType,
  GroupSize,
  Listing,
  ListingType,
  RequestType,
  SwapRequest,
} from "@/lib/data/types";

export type DataContextValue = {
  ready: boolean;
  users: User[];
  listings: Listing[];
  requests: SwapRequest[];
  wishlist: string[];

  getUser: (userId: string) => User | undefined;
  getListing: (listingId: string) => Listing | undefined;

  createListing: (input: NewListingInput) => Listing | null;
  sendRequest: (args: {
    requestType: RequestType;
    targetListingId: string;
    offeringListingId?: string;
    message: string;
    /** When the target listing is not in the cached global listings slice (e.g. profile-only view). */
    targetOwnerUserId?: string;
  }) => Promise<SwapRequest | null>;
  /** @deprecated Use sendRequest */
  requestSwap: (args: {
    targetListingId: string;
    offeringListingId: string;
    message: string;
  }) => Promise<SwapRequest | null>;
  acceptRequest: (requestId: string) => Promise<SwapRequest | null>;
  declineRequest: (requestId: string) => void;
  withdrawRequest: (requestId: string) => boolean;
  updateListing: (
    listingId: string,
    patch: {
      dateTime?: string;
      groupSize?: GroupSize;
      message?: string;
      menu?: string;
      menuPdfId?: string;
      clearMenuPdf?: boolean;
      listingType?: ListingType;
      formalType?: FormalType;
      price?: number;
    },
  ) => void;
  deleteListing: (listingId: string) => void;
  leaveGroup: (listingId: string) => void;
  removeMember: (listingId: string, memberId: string) => void;
  saveWishlist: (colleges: string[]) => Promise<void>;
};

export const DataContext = createContext<DataContextValue | null>(null);

function mapRequest(doc: Doc<"requests">): SwapRequest {
  const requestType =
    doc.requestType ?? (doc.offeringListingId !== undefined ? "swap" : "pay");
  return {
    id: doc._id,
    fromUserId: doc.fromUserId,
    toUserId: doc.toUserId,
    targetListingId: doc.targetListingId,
    requestType,
    ...(doc.offeringListingId !== undefined
      ? { offeringListingId: doc.offeringListingId }
      : {}),
    message: doc.message,
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
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

  const requestPartyIds = useMemo(() => {
    if (incomingRequests === undefined && outgoingRequests === undefined) {
      return [] as Id<"users">[];
    }
    const ids = new Set<Id<"users">>();
    for (const req of incomingRequests ?? []) {
      ids.add(req.fromUserId);
      ids.add(req.toUserId);
    }
    for (const req of outgoingRequests ?? []) {
      ids.add(req.fromUserId);
      ids.add(req.toUserId);
    }
    return [...ids];
  }, [incomingRequests, outgoingRequests]);

  const requestPartyUsers = useQuery(
    api.users.getPublicByIds,
    ready && requestPartyIds.length > 0 ? { userIds: requestPartyIds } : "skip",
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
  const getOrCreateConversationMut = useMutation(api.chat.getOrCreateConversation);
  const sendChatMessageMut = useMutation(api.chat.sendMessage);

  const users = useMemo<User[]>(() => {
    if (!ready || convexUsers === undefined) return [];
    const byId = new Map<string, User>();
    for (const doc of convexUsers) {
      byId.set(doc._id, mapUser(doc));
    }
    for (const doc of requestPartyUsers ?? []) {
      if (!byId.has(doc._id)) {
        byId.set(doc._id, mapUser(doc));
      }
    }
    return [...byId.values()];
  }, [ready, convexUsers, requestPartyUsers]);

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
        listingType: input.listingType,
        formalType: input.formalType,
        ...(input.menuPdfId !== undefined
          ? { menuPdfId: input.menuPdfId as Id<"_storage"> }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
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
        listingType: input.listingType,
        formalType: input.formalType,
        ...(input.price !== undefined ? { price: input.price } : {}),
        status: "active",
        createdAt: Date.now(),
      };
    },
    [user, createListingMut],
  );

  const sendRequest = useCallback(
    async (args: {
      requestType: RequestType;
      targetListingId: string;
      offeringListingId?: string;
      message: string;
      targetOwnerUserId?: string;
    }): Promise<SwapRequest | null> => {
      if (!user) return null;
      const targetFromCache = listings.find((l) => l.id === args.targetListingId);
      const toUserId =
        targetFromCache?.ownerUserId ?? args.targetOwnerUserId;
      if (!toUserId) return null;
      let result;
      try {
        result = await createRequestMut({
          requestType: args.requestType,
          targetListingId: args.targetListingId as Id<"listings">,
          ...(args.offeringListingId !== undefined
            ? { offeringListingId: args.offeringListingId as Id<"listings"> }
            : {}),
          message: args.message,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not send request.";
        throw new Error(message);
      }
      if (args.message.trim()) {
        try {
          const conversationId = await getOrCreateConversationMut({
            otherUserId: toUserId as Id<"users">,
          });
          await sendChatMessageMut({
            conversationId,
            body: args.message.trim(),
          });
        } catch {
          // Request succeeded; chat seed is best-effort.
        }
      }
      return {
        id: result.requestId,
        fromUserId: user.id,
        toUserId,
        targetListingId: args.targetListingId,
        requestType: args.requestType,
        ...(args.offeringListingId !== undefined
          ? { offeringListingId: args.offeringListingId }
          : {}),
        message: args.message,
        status: result.autoAccepted ? "accepted" : "pending",
        createdAt: Date.now(),
      };
    },
    [user, listings, createRequestMut, getOrCreateConversationMut, sendChatMessageMut],
  );

  const requestSwap = useCallback(
    (args: {
      targetListingId: string;
      offeringListingId: string;
      message: string;
    }) =>
      sendRequest({
        requestType: "swap",
        targetListingId: args.targetListingId,
        offeringListingId: args.offeringListingId,
        message: args.message,
      }),
    [sendRequest],
  );

  const acceptRequest = useCallback(
    async (requestId: string): Promise<SwapRequest | null> => {
      if (!user) return null;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") {
        return null;
      }
      await acceptRequestMut({ requestId: requestId as Id<"requests"> });
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
      patch: {
        dateTime?: string;
        groupSize?: GroupSize;
        message?: string;
        menu?: string;
        menuPdfId?: string;
        clearMenuPdf?: boolean;
        listingType?: ListingType;
        formalType?: FormalType;
        price?: number;
      },
    ) => {
      if (!user) return;
      void updateListingMut({
        listingId: listingId as Id<"listings">,
        ...(patch.dateTime !== undefined ? { dateTime: patch.dateTime } : {}),
        ...(patch.groupSize !== undefined ? { groupSize: patch.groupSize } : {}),
        ...(patch.message !== undefined ? { message: patch.message } : {}),
        ...(patch.menu !== undefined ? { menu: patch.menu } : {}),
        ...(patch.clearMenuPdf
          ? { menuPdfId: null }
          : patch.menuPdfId !== undefined
            ? { menuPdfId: patch.menuPdfId as Id<"_storage"> }
            : {}),
        ...(patch.listingType !== undefined
          ? { listingType: patch.listingType }
          : {}),
        ...(patch.formalType !== undefined
          ? { formalType: patch.formalType }
          : {}),
        ...(patch.price !== undefined ? { price: patch.price } : {}),
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
      wishlist: wishlistColleges,
      getUser,
      getListing,
      createListing,
      sendRequest,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      updateListing,
      deleteListing,
      leaveGroup,
      removeMember,
      saveWishlist,
    }),
    [
      ready,
      users,
      listings,
      requests,
      wishlistColleges,
      getUser,
      getListing,
      createListing,
      sendRequest,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      updateListing,
      deleteListing,
      leaveGroup,
      removeMember,
      saveWishlist,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
