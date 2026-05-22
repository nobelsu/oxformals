import type { Doc } from "@/convex/_generated/dataModel";
import type { GroupSize, Listing } from "@/lib/data/types";

type ConvexListingDoc = Doc<"listings"> & {
  menuPdfUrl?: string | null;
  menuFileContentType?: string | null;
};

export function mapConvexListing(doc: ConvexListingDoc): Listing {
  return {
    id: doc._id,
    ownerUserId: doc.ownerUserId,
    college: doc.college,
    dateTime: doc.dateTime,
    groupSize: doc.groupSize as GroupSize,
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
    ...(doc.price !== undefined ? { price: doc.price } : {}),
    status: doc.status,
    createdAt: doc._creationTime,
  };
}
