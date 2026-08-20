import { internalMutation } from "./_generated/server";

/**
 * One-off backfill: stamp every existing listing that predates the
 * `formalType` field as a "social" formal. Safe to re-run — it only patches
 * rows that are still missing the field.
 *
 * Run with: `npx convex run migrations:backfillFormalTypeSocial`
 */
export const backfillFormalTypeSocial = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    let updated = 0;
    for (const listing of listings) {
      if (listing.formalType === undefined) {
        await ctx.db.patch(listing._id, { formalType: "social" });
        updated += 1;
      }
    }
    return { total: listings.length, updated };
  },
});
