# Follow graph — design

Date: 2026-08-17
Status: approved, ready for planning

## Context

oxformals is being restructured around a Beli-style social feed as the home
surface: reviews from formals that people you follow attended, plus posts when
someone lists a formal at a college on your wishlist. The rankings page is being
deprecated and the Activity tab is absorbed into the feed, leaving four surfaces
— Feed, Browse, Chats, Profile.

None of that is possible without a social edge, and the schema has none today.
This spec covers **only the follow graph**: the edge, its privacy semantics, and
the minimum UI needed for every state to be reachable. The feed itself is a
separate spec.

## Decisions

| Question | Decision |
|---|---|
| Edge direction | Asymmetric — following is one-way. |
| Approval | Only for private accounts. Public accounts follow instantly. |
| Default | Public. Users opt in to private. |
| What private hides | Profile-page content: listings, attended formals, reviews. |
| What private does **not** hide | Listings in Browse, reviews on college pages, and the descriptor fields (`interests`, `year`, `role`) that travel with a listing. |
| Declined requests | Deleted, not retained as a status. |
| Requests inbox | Long-term: a feed item. This spec ships an interim list on your own profile. |
| Notifications | Not in v1. |

### Why private does not hide listings

Hiding a private user's listings from Browse would undercut the marketplace: a
private host would receive no requests, which is not what "private" is meant to
mean here. Listings carry the host's `interests`, `year`, and `role`, and
`ListingRow` renders them — so those fields stay visible even for private users.
Privacy governs the profile page and (later) feed reach. This boundary is
deliberate; revisit it only by also deciding what a private user's Browse row
should look like.

## Shared-backend constraint

`oxformals` and `oxformals-mobile` point at the **same Convex deployment**
(`dazzling-spaniel-406`) and their `convex/schema.ts` files are currently
byte-identical. Every schema and function change in this spec must be mirrored
into `oxformals-mobile/convex/`, and gating `getPublicProfile` changes what the
mobile app receives as soon as it deploys. Treat the two `convex/` directories as
one artifact that happens to live in two repos.

## Data model

```ts
follows: defineTable({
  followerUserId: v.id("users"),
  followeeUserId: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  createdAt: v.number(),
  respondedAt: v.optional(v.number()),
})
  .index("by_follower_and_followee", ["followerUserId", "followeeUserId"])
  .index("by_followee_and_status", ["followeeUserId", "status"])
  .index("by_follower_and_status", ["followerUserId", "status"]),
```

Three indexes for three access patterns: membership test (is A following B),
followers list and pending inbox, following list and feed fan-in.

Unlike `requests`, there is no `declined` status. A declined swap request carries
history worth keeping; a declined follow is just an absence, and retaining it
would block re-requesting.

`users` gains `isPrivate: v.optional(v.boolean())` — absent means public.

**No denormalised follower counts.** At single-university scale an indexed count
is cheap, and a counter is a consistency liability for no gain. Revisit only if
profile reads measurably suffer.

## State transitions

- Follow a public user → row inserted as `accepted`.
- Follow a private user → row inserted as `pending`.
- Accept → `status: "accepted"`, `respondedAt` set.
- Decline → row deleted.
- Unfollow → row deleted, valid from either state, so it also serves as "cancel
  my pending request".
- Public → private → existing `accepted` followers keep access. The alternative
  silently revokes people who were legitimately admitted.
- Private → public → pending rows auto-accept, since the gate they were waiting
  on no longer exists.

## API — `convex/follows.ts`

Mutations:

- `follow({ userId })` — auth required; rejects self-follow; idempotent (an
  existing row returns its current state rather than inserting a duplicate).
  Re-reads the target's `isPrivate` inside the transaction rather than trusting
  the client's view.
- `unfollow({ userId })` — deletes the row from either state.
- `respondToFollowRequest({ followerUserId, accept })` — accept updates, decline
  deletes. A row that no longer exists is a no-op, not an error.
- `setPrivacy({ isPrivate })` — flips the flag; on going public, auto-accepts
  pending rows.

Queries:

- `listFollowers({ userId })` / `listFollowing({ userId })` — gated by the same
  visibility rule as the profile: on a private account, non-followers cannot
  enumerate either list.
- `listPendingRequests()` — the viewer's inbox.
- `followStatesFor({ userIds })` — batched. The feed will render many rows each
  needing a button state; per-row queries are the obvious performance trap.
- `followCounts({ userId })`.

**Gates:** `optionalUserId` for auth and `hasVerifiedEmail` for eligibility. The
chat picker already restricts to verified users; following should match, or
unverified accounts become a spam vector.

## Privacy enforcement

`getPublicProfile` (`convex/users.ts:311`) is already the single source of
profile content and already performs viewer-dependent gating via
`hasRevealableContact`. Extend it rather than adding a second gate:

- When the target is private and the viewer is neither the owner nor an accepted
  follower: return identity fields only (`name`, `college`, `year`, `avatar`) and
  an empty `listings` array. Omit `interests`, `subject`, `dietaryRequirements`,
  and contact details.
- Always return `viewerFollowState: "self" | "none" | "pending" | "following"` so
  the button has exactly one thing to read.

The decision itself is extracted so it can be tested:

```ts
// lib/data/profileVisibility.ts
export function canViewProfileContent(args: {
  isPrivate: boolean;
  viewerUserId: string | null;
  ownerUserId: string;
  followStatus: "none" | "pending" | "accepted";
}): boolean;
```

## UI surfaces

1. **Profile page** — Follow / Requested / Following button driven by
   `viewerFollowState`; follower and following counts; a locked state replacing
   the listings section for private non-followers.
2. **Privacy toggle** — in `ProfileEditor`, alongside the existing preferences.
3. **Interim requests list** — pending requests with Accept/Decline on your own
   profile, visible only to you.

### Why the interim list exists

Long-term, pending requests are feed items. But the feed does not exist yet, and
shipping the graph without any accept UI would leave a private account that can
be requested and never accept — a dead end rather than a partial feature. The
interim list calls exactly the mutations the future feed card will call, so only
the rendering moves when the feed lands.

## Correctness cases

Each is a real race in a reactive backend, not a hypothetical:

- Double-follow → idempotent, no duplicate rows.
- Target flips to private between the client's read and the mutation → the
  mutation re-reads `isPrivate` in-transaction, so the row lands as `pending`.
- Accepting a request the follower already cancelled → row is gone; no-op.
- Unfollow then re-follow a private account → a new `pending` row, never a
  resurrected `accepted`.

## Testing

Convex functions have no test harness in this repo — every existing test is a
pure function under `lib/data`, run with `npx tsx --test`. Accordingly the
visibility rule is extracted into `lib/data/profileVisibility.ts` and unit-tested
there: public always visible; owner sees own profile; accepted follower sees;
pending does not; logged-out does not. Same split as `groupListingsByDay`.

Mutation behaviour is verified manually against the dev deployment.

## Out of scope

The feed and its item types; the pending-request feed card; notifications
(email or push) for follow events; blocking and muting; follower removal; the
rankings deprecation; the four-tab IA change.
