import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";

/** Route segment for attended-formal UI preview — not a real listing id. */
export const ATTENDED_FORMAL_PREVIEW_LISTING_ID = "preview-attended-formal";

export function isAttendedFormalPreviewListingId(id: string): boolean {
  return id === ATTENDED_FORMAL_PREVIEW_LISTING_ID;
}

export const attendedFormalPreviewOwner: User = {
  id: "preview-attended-owner",
  email: "alex.host@example.com",
  name: "Alex Host",
  college: "Trinity",
  year: "2nd",
  role: "Undergraduate",
  interests: [],
  subject: "History",
  uiFont: DEFAULT_UI_FONT,
};

export const attendedFormalPreviewListing: Listing = {
  id: ATTENDED_FORMAL_PREVIEW_LISTING_ID,
  ownerUserId: attendedFormalPreviewOwner.id,
  college: "Trinity",
  dateTime: "2025-11-14T19:30:00.000Z",
  groupSize: 4,
  seatsAvailable: 0,
  members: [attendedFormalPreviewOwner.id, "preview-viewer"],
  year: "3rd",
  role: "Undergraduate",
  message: "Lovely hall dinner — preview only, not saved anywhere.",
  menu: "Three-course formal dinner",
  listingType: "swap",
  status: "closed",
  createdAt: Date.UTC(2025, 10, 1),
};
