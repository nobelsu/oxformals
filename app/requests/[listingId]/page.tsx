import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ listingId: string }>;
};

/**
 * The old per-listing page. Its job (requests, edit, delete, guests) now lives
 * in the listing popup on the feed, so links from emails, notifications and
 * chats open that instead.
 */
export default async function ListingRequestsPage({ params }: Props) {
  const { listingId } = await params;
  redirect(`/?listing=${encodeURIComponent(listingId)}`);
}
