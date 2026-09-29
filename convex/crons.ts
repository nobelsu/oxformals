import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire past listings",
  { hours: 1 },
  internal.listings.expirePastListings,
  {},
);

crons.interval(
  "pay hosts their credits",
  { hours: 1 },
  internal.credits.settleDueHolds,
  {},
);

// Retention limits promised in the privacy policy (see convex/retention.ts).
crons.cron(
  "enforce retention limits",
  "30 3 * * *",
  internal.retention.runDaily,
  {},
);

export default crons;
