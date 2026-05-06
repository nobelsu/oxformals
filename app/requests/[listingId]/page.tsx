import { ListingRequestsView } from "@/components/swap/ListingRequestsView";

type Props = {
  params: Promise<{ listingId: string }>;
};

export default async function ListingRequestsPage({ params }: Props) {
  const { listingId } = await params;
  return <ListingRequestsView listingId={listingId} />;
}
