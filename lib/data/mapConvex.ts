import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { User } from "@/lib/auth/types";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import type { Listing } from "./types";

export type PublicUserDoc = {
  _id: Id<"users">;
  name?: string;
  email?: string;
  college?: string;
  year?: string;
  role?: string;
  interests?: string[];
  subject?: string;
  uiFont?: Doc<"users">["uiFont"];
  instagramHandle?: string;
  whatsappPhone?: string;
  avatar?: Doc<"users">["avatar"];
};

export function mapUser(doc: PublicUserDoc): User {
  return {
    id: doc._id,
    email: doc.email ?? "",
    name: doc.name ?? "",
    college: doc.college ?? "",
    year: doc.year ?? "",
    role: doc.role ?? "",
    interests: doc.interests ?? [],
    subject: doc.subject ?? "",
    uiFont: doc.uiFont ?? DEFAULT_UI_FONT,
    ...(doc.instagramHandle ? { instagramHandle: doc.instagramHandle } : {}),
    ...(doc.whatsappPhone ? { whatsappPhone: doc.whatsappPhone } : {}),
    ...(doc.avatar ? { avatar: doc.avatar } : {}),
  };
}

export type ConvexListingDoc = Doc<"listings"> & {
  menuPdfUrl?: string | null;
  menuFileContentType?: string | null;
};

export function mapListing(doc: ConvexListingDoc): Listing {
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
    ...(doc.menuPdfUrl ? { menuPdfUrl: doc.menuPdfUrl } : {}),
    ...(doc.menuFileContentType
      ? { menuFileContentType: doc.menuFileContentType }
      : {}),
    listingType: doc.listingType ?? "swap",
    formalType: doc.formalType ?? "social",
    ...(doc.price !== undefined ? { price: doc.price } : {}),
    status: doc.status,
    createdAt: doc._creationTime,
  };
}
