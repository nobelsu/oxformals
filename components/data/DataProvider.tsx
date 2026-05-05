"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/useAuth";
import { userStore } from "@/lib/auth/userStore";
import type { User } from "@/lib/auth/types";
import {
  dataClient,
  type NewListingInput,
} from "@/lib/data/dataClient";
import { normalizeCollegeName } from "@/lib/data/colleges";
import { ensureSeeded } from "@/lib/data/seed";
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
  }) => SwapRequest | null;
  acceptRequest: (requestId: string) => SwapRequest | null;
  declineRequest: (requestId: string) => void;
  withdrawRequest: (requestId: string) => boolean;
  sendMessage: (conversationId: string, body: string) => void;
  openConversationWith: (otherUserId: string, listingId?: string) => Conversation | null;
  toggleWishlist: (college: string) => void;
};

export const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (authStatus !== "ready") return;
    if (user) {
      ensureSeeded(user);
    }
    setReady(true);
    refresh();
  }, [authStatus, user, refresh]);

  const users = useMemo<User[]>(() => {
    if (!ready) return [];
    return userStore.list();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  const listings = useMemo<Listing[]>(() => {
    if (!ready) return [];
    return dataClient.listListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  const requests = useMemo<SwapRequest[]>(() => {
    if (!ready) return [];
    return dataClient.listRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!ready) return [];
    return dataClient.listConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  const wishlist = useMemo<string[]>(() => {
    if (!ready || !user) return [];
    return dataClient.getWishlist(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, tick]);

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
      const l = dataClient.createListing(user.id, {
        college,
        year,
        role,
        ...input,
      });
      refresh();
      return l;
    },
    [user, refresh],
  );

  const requestSwap = useCallback(
    (args: {
      targetListingId: string;
      offeringListingId: string;
      message: string;
    }): SwapRequest | null => {
      if (!user) return null;
      const target = dataClient.listingById(args.targetListingId);
      if (!target) return null;
      const req = dataClient.createRequest({
        fromUserId: user.id,
        toUserId: target.ownerUserId,
        targetListingId: args.targetListingId,
        offeringListingId: args.offeringListingId,
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
      return req;
    },
    [user, refresh],
  );

  const acceptRequest = useCallback(
    (requestId: string): SwapRequest | null => {
      if (!user) return null;
      const req = dataClient.listRequests().find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") {
        return null;
      }
      const updated = dataClient.acceptRequest(requestId);
      refresh();
      return updated;
    },
    [user, refresh],
  );

  const declineRequest = useCallback(
    (requestId: string) => {
      if (!user) return;
      const req = dataClient.listRequests().find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") return;
      dataClient.respondToRequest(requestId, "declined");
      refresh();
    },
    [user, refresh],
  );

  const withdrawRequest = useCallback(
    (requestId: string): boolean => {
      if (!user) return false;
      const req = dataClient.listRequests().find((r) => r.id === requestId);
      if (!req || req.fromUserId !== user.id || req.status !== "pending") {
        return false;
      }
      const ok = dataClient.withdrawRequest(requestId);
      if (ok) refresh();
      return ok;
    },
    [user, refresh],
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

  const toggleWishlist = useCallback(
    (college: string) => {
      if (!user) return;
      dataClient.toggleWishlistCollege(user.id, college);
      refresh();
    },
    [user, refresh],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      users,
      listings,
      requests,
      conversations,
      wishlist,
      getUser,
      getListing,
      messagesFor,
      createListing,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      sendMessage,
      openConversationWith,
      toggleWishlist,
    }),
    [
      ready,
      users,
      listings,
      requests,
      conversations,
      wishlist,
      getUser,
      getListing,
      messagesFor,
      createListing,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      sendMessage,
      openConversationWith,
      toggleWishlist,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
