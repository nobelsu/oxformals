export type ListingStatus = "active" | "confirmed" | "closed";

export type Listing = {
  id: string;
  ownerUserId: string;
  college: string;
  dateTime: string; // ISO
  groupSize: 2 | 3 | 4;
  seatsAvailable: number;
  members: string[];
  /** Snapshot from the poster's profile when the listing was created. */
  year: string;
  /** Snapshot from the poster's profile when the listing was created. */
  role: string;
  message: string;
  menu: string;
  status: ListingStatus;
  createdAt: number;
};

export type SwapRequestStatus = "pending" | "accepted" | "declined";

export type SwapRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  targetListingId: string;
  offeringListingId: string;
  message: string;
  status: SwapRequestStatus;
  createdAt: number;
};

export type Conversation = {
  id: string;
  participantIds: [string, string];
  listingId?: string;
  updatedAt: number;
};

export type Message = {
  id: string;
  conversationId: string;
  fromUserId: string;
  body: string;
  createdAt: number;
};

export type Wishlists = Record<string, string[]>;
