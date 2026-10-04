import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ListingCard } from "@/lib/share/cards";
import { convexClient, renderCard } from "@/lib/share/route";

/** Instagram story card (1080×1920 PNG) for a listing. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return renderCard(async () => {
    const card = await convexClient().query(api.share.getListingShareCard, {
      listingId: id as Id<"listings">,
    });
    return card ? <ListingCard {...card} /> : null;
  });
}
