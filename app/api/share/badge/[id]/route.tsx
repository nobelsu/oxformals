import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { badgeById } from "@/lib/data/badges";
import { CollegeStampCard } from "@/lib/share/cards";
import { convexClient, renderCard } from "@/lib/share/route";

/** Story card for a college stamp. `id` is "<userId>~<badgeId>". */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [userId, badgeId] = decodeURIComponent(id).split("~");
  return renderCard(async () => {
    const def = badgeId ? badgeById(badgeId) : undefined;
    if (!userId || !def || def.family !== "college") return null;
    const card = await convexClient().query(api.share.getBadgeShareCard, {
      userId: userId as Id<"users">,
      badgeId,
    });
    return card ? (
      <CollegeStampCard
        firstName={card.firstName}
        college={def.college}
        collegesVisited={card.collegesVisited}
        totalColleges={card.totalColleges}
      />
    ) : null;
  });
}
