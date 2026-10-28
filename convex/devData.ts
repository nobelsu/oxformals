import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

/**
 * Reset a dev deployment to fake people (used by Vercel previews).
 *
 *   npx convex env set DEV_DATA_RESET 1        # dev only, never prod
 *   npx convex env set OUTBOUND_DISABLED 1
 *   npx convex run devData:wipe '{"keepUserIds": ["<id>", ...]}'
 *   npx convex run devData:seed
 *   npx convex run collegeStats:backfill
 *   npx convex run siteStats:recompute
 *
 * Both functions refuse to run unless DEV_DATA_RESET=1 on the deployment.
 * Seeded people sign up with @seed.oxformals.test addresses (non-routable)
 * and an approved card check, so they count as members without an Oxford
 * address that could belong to someone real.
 */

const SEED_EMAIL_DOMAIN = "seed.oxformals.test";
const WIPE_BATCH = 400;

function assertResetAllowed() {
  if (process.env.DEV_DATA_RESET !== "1") {
    throw new ConvexError("DEV_DATA_RESET is not set on this deployment.");
  }
}

type KeepRule = "none" | "all" | { field: string };

/**
 * Wipe order matters: auth rows that point at sessions/accounts go after
 * the rows they point at, so "keep" can check the parent still exists.
 */
const WIPE_PLAN: Array<[TableNames, KeepRule]> = [
  ["bioReports", "none"],
  ["blocks", "none"],
  ["cardChecks", "none"],
  ["collegeGuides", "none"],
  ["collegeReviewReports", "none"],
  ["collegeReviewVotes", "none"],
  ["collegeReviews", "none"],
  ["collegeTips", "none"],
  ["conversationMembers", "none"],
  ["conversations", "none"],
  ["creditHolds", "none"],
  ["feedBookmarks", "none"],
  ["feedComments", "none"],
  ["feedLikes", "none"],
  ["follows", "none"],
  ["formalAttendanceConfirmations", "none"],
  ["listings", "none"],
  ["messages", "none"],
  ["notifications", "none"],
  ["partyInvites", "none"],
  ["referrals", "none"],
  ["reports", "none"],
  ["requests", "none"],
  ["seatLinks", "none"],
  ["swapBreaks", "none"],
  ["wishlists" as TableNames, "none"],
  ["collegeWishlists", { field: "userId" }],
  ["creditAccounts", { field: "userId" }],
  ["inviteCodes", { field: "userId" }],
  ["pushTokens", { field: "userId" }],
  ["uploadedFiles", { field: "ownerUserId" }],
  ["userBadges", { field: "userId" }],
  ["webPushSubscriptions", { field: "userId" }],
  ["users", { field: "_id" }],
  ["authAccounts", { field: "userId" }],
  ["authSessions", { field: "userId" }],
  ["authRefreshTokens", "none"], // kept when their session survived (below)
  ["authVerificationCodes", "none"],
  ["authVerifiers", "none"],
  ["authRateLimits", "none"],
  ["collegeStats", "all"],
  ["siteStats", "all"],
];

export const wipe = internalMutation({
  args: {
    keepUserIds: v.array(v.id("users")),
    step: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertResetAllowed();
    const keep = new Set<string>(args.keepUserIds);
    const step = args.step ?? 0;

    if (step >= WIPE_PLAN.length) {
      // Last: stored files nobody we kept uploaded (card photos, menus, review images).
      const keptFiles = new Set<string>();
      for (const userId of args.keepUserIds) {
        const rows = await ctx.db
          .query("uploadedFiles")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
          .take(500);
        for (const row of rows) keptFiles.add(row.storageId);
      }
      const page = await ctx.db.system
        .query("_storage")
        .paginate({ numItems: WIPE_BATCH, cursor: args.cursor ?? null });
      for (const file of page.page) {
        if (!keptFiles.has(file._id)) await ctx.storage.delete(file._id);
      }
      if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.devData.wipe, {
          keepUserIds: args.keepUserIds,
          step,
          cursor: page.continueCursor,
        });
      } else {
        console.log("devData.wipe: done");
      }
      return null;
    }

    const [table, rule] = WIPE_PLAN[step];
    const page = await ctx.db
      .query(table)
      .paginate({ numItems: WIPE_BATCH, cursor: args.cursor ?? null });

    for (const doc of page.page) {
      if (rule === "all") continue;
      const row = doc as unknown as Record<string, unknown>;
      if (typeof rule === "object" && keep.has(String(row[rule.field]))) continue;
      if (table === "authRefreshTokens") {
        const sessionId = row.sessionId as Id<"authSessions">;
        if (await ctx.db.get(sessionId)) continue;
      }
      await ctx.db.delete(doc._id);
    }

    await ctx.scheduler.runAfter(0, internal.devData.wipe, {
      keepUserIds: args.keepUserIds,
      ...(page.isDone
        ? { step: step + 1, cursor: null }
        : { step, cursor: page.continueCursor }),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Seed

const PEOPLE: Array<[string, string]> = [
  ["Amara Okafor", "Balliol"], ["Theo Lindqvist", "Merton"],
  ["Priya Raman", "Kellogg"], ["Jonah Whitaker", "Christ Church"],
  ["Mei Tanaka", "St Anne's"], ["Felix Moreau", "Magdalen"],
  ["Sofia Esposito", "Wolfson"], ["Kwame Mensah", "Reuben"],
  ["Hannah Brooks", "Keble"], ["Arjun Mehta", "St Edmund Hall"],
  ["Clara Novak", "Somerville"], ["Daniel Oyelaran", "Exeter"],
  ["Isla Fraser", "Jesus"], ["Mateo Alvarez", "Linacre"],
  ["Yuna Park", "Green Templeton"], ["Oscar Bennett", "Trinity"],
  ["Leila Haddad", "St Hugh's"], ["Samuel Achebe", "Mansfield"],
  ["Freya Lund", "Lincoln"], ["Ravi Krishnan", "St Cross"],
  ["Elena Petrova", "St Antony's"], ["Tom Ashworth", "Oriel"],
  ["Zara Qureshi", "Lady Margaret Hall"], ["Lucas Ferreira", "Pembroke"],
  ["Ava Sinclair", "Hertford"], ["Benedict Hale", "New College"],
  ["Nadia Rahman", "St Catherine's"], ["Jun Wei Chen", "Kellogg"],
  ["Grace Adeyemi", "Wolfson"], ["Hugo Laurent", "Brasenose"],
  ["Maya Goldberg", "Queen's"], ["Ethan Clarke", "St John's"],
  ["Ines Duarte", "Reuben"], ["Callum Reid", "Worcester"],
  ["Anya Volkova", "St Hilda's"], ["Ibrahim Saleh", "Harris Manchester"],
  ["Rosie Turner", "St Peter's"], ["Kai Nakamura", "Corpus Christi"],
  ["Lottie Evans", "University"], ["Omar Farouk", "Wadham"],
];

const ROLES: Array<[string, string]> = [
  ["Undergrad", "1"], ["Undergrad", "2"], ["Undergrad", "3"],
  ["Masters", "1"], ["DPhil", "2"], ["DPhil", "3"],
];

const AVATARS = ["fox", "bear", "owl", "rose", "star", "wave", "leaf", "moon"];

const BIOS = [
  "Will trade a seat for a good dessert.",
  "Chemist by day, formal enthusiast by night.",
  "Here for the candlelight and the gossip.",
  "Rowing, then dinner. Always dinner.",
  "Ask me about the best college puddings.",
  "New to Oxford, saying yes to everything.",
  "PPE, black coffee, long tables.",
  "Collecting colleges like stamps.",
];

const LISTING_MESSAGES = [
  "Lovely hall, good wine, chatty crowd. Swap welcome!",
  "Themed night with live music. Bring someone fun.",
  "Quiet formal, great food. Happy to show you around after.",
  "Our chef does a brilliant duck. Come hungry.",
  "Gowns on, candles lit. Looking for a swap this term.",
  "Small group, very relaxed. First-timers welcome.",
];

const REVIEW_COMMENTS = [
  "The dessert alone was worth it. Hall was stunning.",
  "Lovely atmosphere, a bit loud by the end. Would go again.",
  "Food was fine, company was excellent.",
  "Best formal I've been to this term. Ask for the cheese course.",
  "Short and sweet. Great value for the price.",
  "Candles, Latin grace, three courses. Classic.",
];

const CHAT_LINES = [
  "Hey! Still keen for Thursday?",
  "Yes! What time should I meet you at the lodge?",
  "6:30 at the lodge works. Gown or no gown?",
  "Gowns tonight, it's a formal formal.",
  "Perfect, see you then!",
  "Thanks for having me, that was great.",
];

const TIMES_UTC = ["18:45", "19:00", "19:15", "19:30"];

/** Small deterministic PRNG so every reset gives the same shape of data. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function dayAt(daysFromToday: number, time: string, nowMs: number): string {
  const d = new Date(nowMs);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  const [h, m] = time.split(":").map(Number);
  d.setUTCHours(h, m, 0, 0);
  return d.toISOString();
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
}

async function insertDm(
  ctx: MutationCtx,
  a: Id<"users">,
  b: Id<"users">,
  lines: string[],
  startMs: number,
) {
  const [low, high] = a < b ? [a, b] : [b, a];
  const lastAt = startMs + lines.length * 60_000;
  const conversationId = await ctx.db.insert("conversations", {
    kind: "dm",
    participantLow: low,
    participantHigh: high,
    lastMessageAt: lastAt,
    participantLowLastReadAt: lastAt,
  });
  for (const [i, body] of lines.entries()) {
    await ctx.db.insert("messages", {
      conversationId,
      senderUserId: i % 2 === 0 ? a : b,
      body,
    });
  }
}

export const seed = internalMutation({
  args: {},
  returns: v.object({
    users: v.number(),
    listings: v.number(),
    requests: v.number(),
    reviews: v.number(),
  }),
  handler: async (ctx) => {
    assertResetAllowed();
    const already = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", `${slug(PEOPLE[0][0])}@${SEED_EMAIL_DOMAIN}`),
      )
      .first();
    if (already) throw new ConvexError("Already seeded. Run devData:wipe first.");

    const rand = rng(42);
    const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
    const now = Date.now();

    // The people we kept (your own accounts) join in so their feeds aren't empty.
    const kept = (await ctx.db.query("users").take(50)).filter((u) => !u.deletedAt);

    // People
    const people: Array<{ id: Id<"users">; college: string; role: string; year: string }> = [];
    for (const [i, [name, college]] of PEOPLE.entries()) {
      const [role, year] = ROLES[i % ROLES.length];
      const id = await ctx.db.insert("users", {
        name,
        email: `${slug(name)}@${SEED_EMAIL_DOMAIN}`,
        emailVerificationTime: now,
        college,
        role,
        year,
        bio: BIOS[i % BIOS.length],
        avatar: { kind: "preset", id: AVATARS[i % AVATARS.length] },
        agreedToRules: true,
        agreedToTermsAt: now,
        emailNotifications: false,
        pushChatAlerts: false,
        isPrivate: i % 13 === 7,
      });
      await ctx.db.insert("cardChecks", {
        userId: id,
        status: "approved",
        college,
        reason: "Seeded test account",
        decidedBy: "auto",
        createdAt: now,
        decidedAt: now,
      });
      people.push({ id, college, role, year });
    }

    // Follows: a loose web, plus everyone kept follows and is followed by a few.
    for (const [i, p] of people.entries()) {
      for (const offset of [1, 3, 7]) {
        const other = people[(i + offset) % people.length];
        await ctx.db.insert("follows", { followerId: p.id, followeeId: other.id, status: "active" });
      }
    }
    for (const k of kept) {
      for (const p of people.slice(0, 12)) {
        await ctx.db.insert("follows", { followerId: k._id, followeeId: p.id, status: "active" });
        await ctx.db.insert("follows", { followerId: p.id, followeeId: k._id, status: "active" });
      }
    }

    // Upcoming formals over the next three weeks, some partly filled.
    let listingCount = 0;
    let requestCount = 0;
    const upcoming: Id<"listings">[] = [];
    for (const [i, host] of people.entries()) {
      if (i % 4 === 3) continue;
      const groupSize = pick([2, 3, 4, 4, 5, 6] as const);
      const joinCount = Math.min(groupSize - 1, Math.floor(rand() * 3));
      const joiners = Array.from({ length: joinCount }, (_, j) => people[(i + 5 + j * 2) % people.length]);
      const members = [host.id, ...joiners.map((j) => j.id)];
      const seatsAvailable = groupSize - members.length;
      const listingType = pick(["swap", "swap", "pay", "both"] as const);
      const listingId = await ctx.db.insert("listings", {
        ownerUserId: host.id,
        college: host.college,
        dateTime: dayAt(1 + Math.floor(rand() * 21), pick(TIMES_UTC), now),
        groupSize,
        seatsAvailable,
        members,
        year: host.year,
        role: host.role,
        message: pick(LISTING_MESSAGES),
        menu: "",
        status: seatsAvailable === 0 ? "confirmed" : "active",
        listingType,
        formalType: pick(["social", "social", "networking", "matchmaking"] as const),
        ...(listingType === "swap" ? {} : { price: pick([12, 15, 18, 22]) }),
      });
      listingCount++;
      upcoming.push(listingId);
      for (const j of joiners) {
        await ctx.db.insert("requests", {
          fromUserId: j.id,
          toUserId: host.id,
          targetListingId: listingId,
          requestType: "credit",
          message: "Would love to come!",
          status: "accepted",
        });
        requestCount++;
      }
      if (seatsAvailable > 0 && rand() < 0.5) {
        const asker = people[(i + 11) % people.length];
        await ctx.db.insert("requests", {
          fromUserId: asker.id,
          toUserId: host.id,
          targetListingId: listingId,
          requestType: "credit",
          message: "Is there still space? Happy to swap back.",
          status: "pending",
        });
        requestCount++;
      }
    }

    // A formal each for the kept accounts, with someone asking to join.
    for (const [i, k] of kept.entries()) {
      if (!k.college || !k.role) continue;
      const listingId = await ctx.db.insert("listings", {
        ownerUserId: k._id,
        college: k.college,
        dateTime: dayAt(4 + i * 3, "19:00", now),
        groupSize: 4,
        seatsAvailable: 3,
        members: [k._id],
        year: k.year ?? "",
        role: k.role,
        message: "Test formal for previews.",
        menu: "",
        status: "active",
        listingType: "swap",
        formalType: "social",
      });
      listingCount++;
      await ctx.db.insert("requests", {
        fromUserId: people[i].id,
        toUserId: k._id,
        targetListingId: listingId,
        requestType: "credit",
        message: "Hi! Could I join you?",
        status: "pending",
      });
      requestCount++;
    }

    // Past formals with attendance and reviews, so the feed and college pages fill up.
    let reviewCount = 0;
    for (let i = 0; i < 18; i++) {
      const host = people[(i * 3) % people.length];
      const guest = people[(i * 3 + 4) % people.length];
      const listingId = await ctx.db.insert("listings", {
        ownerUserId: host.id,
        college: host.college,
        dateTime: dayAt(-(2 + i * 2), pick(TIMES_UTC), now),
        groupSize: 2,
        seatsAvailable: 0,
        members: [host.id, guest.id],
        year: host.year,
        role: host.role,
        message: pick(LISTING_MESSAGES),
        menu: "",
        status: "confirmed",
        listingType: "swap",
        formalType: "social",
      });
      listingCount++;
      await ctx.db.insert("requests", {
        fromUserId: guest.id,
        toUserId: host.id,
        targetListingId: listingId,
        requestType: "credit",
        message: "Would love to come!",
        status: "accepted",
      });
      requestCount++;
      for (const userId of [host.id, guest.id]) {
        await ctx.db.insert("formalAttendanceConfirmations", {
          listingId,
          userId,
          confirmedAt: now - i * 86_400_000,
          attended: true,
        });
      }
      const overall = 3 + Math.floor(rand() * 3);
      const reviewId = await ctx.db.insert("collegeReviews", {
        userId: guest.id,
        listingId,
        college: host.college,
        ratings: {
          food: Math.max(1, overall - Math.floor(rand() * 2)),
          atmosphere: Math.min(5, overall + Math.floor(rand() * 2)),
          value: 2 + Math.floor(rand() * 4),
          overall,
        },
        comment: pick(REVIEW_COMMENTS),
        isAnonymous: i % 5 === 0,
        updatedAt: now - i * 86_400_000,
        voteScore: 0,
      });
      reviewCount++;
      for (const liker of [people[(i + 9) % people.length], people[(i + 17) % people.length]]) {
        await ctx.db.insert("feedLikes", { targetKey: `review:${reviewId}`, userId: liker.id });
      }
      if (i % 3 === 0) {
        await ctx.db.insert("feedComments", {
          targetKey: `review:${reviewId}`,
          userId: people[(i + 2) % people.length].id,
          text: "Adding this to my list!",
        });
      }
    }

    // Chats: a few between seeded people, and one with each kept account.
    for (let i = 0; i < 6; i++) {
      await insertDm(ctx, people[i].id, people[i + 10].id, CHAT_LINES.slice(0, 3 + (i % 4)), now - (i + 1) * 3_600_000);
    }
    for (const [i, k] of kept.entries()) {
      await insertDm(ctx, people[20 + i].id, k._id, CHAT_LINES.slice(0, 4), now - (i + 1) * 1_800_000);
    }

    return { users: people.length, listings: listingCount, requests: requestCount, reviews: reviewCount };
  },
});
