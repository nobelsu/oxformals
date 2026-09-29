# Notifications and invites — design

Agreed with the user on 2026-09-29. Two parts, shipped in order: notifications
first (invites notify people, so they build on it), then invite links.
Mockup: `notifications.html` (bell panel, alerts prompt, settings grid).

## Part 1 — notifications

### Data

- `notifications { userId, category, kind, actorId?, listingId?, requestId?,
  data?, dedupeKey, readAt?, createdAt }`
  - `category`: `"bookings" | "invites" | "social" | "credits"`.
  - `kind` (fixed list, each belongs to one category):
    - bookings: `request_received`, `request_accepted`, `request_declined`,
      `formal_cancelled`, `swap_undone`
    - invites: `party_invite` (you were added to a group), `party_response`
      (a friend said "I'm in" / "Not me" to yours), `seat_link_claimed`
    - social: `new_follower`, `follow_request`, `now_friends`,
      `invite_joined`
    - credits: `credit_earned`, `credit_paid_out`, `formal_tomorrow`,
      `wishlist_listing`
  - `dedupeKey` = kind + the ids involved; a second notification with the same
    key for the same user within 24h is skipped (undo/redo doesn't spam).
  - Indexes: `by_userId_and_createdAt`, `by_userId_and_readAt`,
    `by_userId_and_dedupeKey`, `by_createdAt` (retention).
- `webPushSubscriptions { userId, endpoint, p256dh, auth, createdAt }`,
  indexes `by_userId`, `by_endpoint`.
- `users.notificationPrefs?: { push: Record<category, boolean>, email:
  Record<category, boolean> }`. Absent = defaults: push on for all four;
  email on for bookings and invites, off for social and credits. If the legacy
  `emailNotifications === false`, all email defaults are off.
  `pushChatAlerts` keeps controlling chat pushes on mobile; web chat pushes
  follow `push.social`.

### Creating notifications

One helper, `notify(ctx, { userId, kind, actorId?, listingId?, requestId?,
data? })`, called inside the mutation where the event happens (same
transaction). It skips self-notifications and deleted users, applies the
dedupe rule, inserts the row, and schedules `deliver` with the new id.

Call sites: `createRequest` (request_received), `acceptRequest` /
`declineRequest` (accepted/declined, plus `party_invite` for each named friend
when the request is created), `respondToPartyInvite` (party_response),
cancel formal (formal_cancelled to each guest), linked swap undo (swap_undone),
`follow` (new_follower, or follow_request for private accounts; now_friends to
both when the follow makes it mutual), `approveFollower` (now_friends when
mutual), credit hold accepted (credit_earned to host, pending) and
`settleDueHolds` (credit_paid_out), new listing at a wishlisted college
(wishlist_listing, alongside the existing email), daily cron at 09:00 London
(formal_tomorrow for everyone seated at a formal the next day).

### Delivery

`deliver` (internal action, `"use node"` for `web-push`):

1. Load the notification, recipient and prefs; render title/body/url from the
   kind (one `renderNotification` function shared with the bell UI).
2. Push, if `push[category]`: web push to every `webPushSubscriptions` row
   (VAPID keys in Convex env `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on the web); 404/410 responses delete the
   subscription. Also Expo push to `pushTokens` via the existing sender.
3. Email, if `email[category]` and the kind has an email: existing templates
   (new request, wishlist listing, formal notices) are routed through here so
   they obey the same prefs; `party_invite` gets a new template. Kinds without
   a template send no email.

Chat messages don't create bell rows (Chats keeps its own unread badge) but do
send a web push, gated by `push.social`.

### Web client

- `public/sw.js`: shows the push (title, body, icon) and focuses/opens the
  `url` on click.
- **Bell** in the signed-in nav, left of the credits chip: outlined circle
  (same style as the menu button), ink count badge (unread, "9+" cap).
- **Panel** (desktop dropdown under the bell, full-screen sheet under 640px):
  "Notifications" + "Mark all read"; sections New (unread) and Earlier; 30
  most recent, "Load more" below. Row = actor avatar, one-line sentence with
  bold names/college, relative time, small accent dot when unread. White
  background for all rows; no tinted unread rows. Inline actions:
  `party_invite` → "I'm in" (ink) / "Not me" (outline); `request_received` →
  "Accept" / "Decline"; after acting, the row shows the outcome instead of
  buttons. Tapping a row opens the listing, profile or request. Opening the
  panel marks everything read.
- **Alerts prompt**: a card at the top of the panel, shown once after the
  user's first request, listing, or party invite — never on page load.
  "Turn on alerts?" / "Know when someone wants your seat." / Turn on, Not now.
  "Turn on" calls `Notification.requestPermission()`, subscribes, and saves the
  subscription. Hidden when unsupported (e.g. iPhone Safari outside the home
  screen) or already decided.
- **Settings**: "Notifications" card with a Push / Email toggle grid for
  Bookings, Group invites, Social, Credits & reminders. No extra copy.
- Empty panel uses the existing icon-card `EmptyState`.

### Housekeeping

Daily cron deletes notifications older than 90 days (batched).

### Tests

Each call site creates the right kind for the right user; no
self-notifications; dedupe within 24h; prefs gate push and email per category
(legacy `emailNotifications: false` respected); `deliver` removes 410'd
subscriptions (web-push mocked); unread count and mark-all-read; retention.

## Part 2 — invites

### Data

- `inviteCodes { userId, code, createdAt }`, `by_code`, `by_userId`. Code =
  6 lowercase letters/digits (no look-alikes), created lazily.
- `referrals { inviterId, inviteeId, source: "link" | "seat", status:
  "pending" | "earned" | "void", createdAt }`, `by_inviteeId`,
  `by_inviterId_and_status`.
- Party seat kind `"link"`: `{ kind: "link", token, payerId, method,
  response: "pending", expiresAt }`; once claimed it becomes a `"friend"`
  seat with the claimer's `userId`. `seatLinks { token, requestId, createdAt }`
  `by_token` for lookup.

### Personal invite link

- `/i/[code]`: public page with the inviter's avatar and name, "[Name]
  invited you", and "Join oxformals". The code is kept in a first-party cookie
  (30 days) across the Oxford-email sign-in.
- `claimInvite` runs after sign-in when the cookie is present:
  - Mutual active follows are created (bypassing private-account approval;
    both sides chose it). Already-following rows are upgraded to active.
  - If the account was created after the code was first opened and has no
    referral yet → `referrals` row `pending`; the inviter gets
    `invite_joined`. Existing users just become friends (no referral).
  - Own code, deleted inviter, or invalid code → no-op; cookie cleared.
- Entry points: "Invite friends" on your profile, the empty Following feed,
  and the group booking step. Uses `navigator.share` when available, else
  copy-to-clipboard.

### Reward

- When a hold or seat the invitee is part of settles (their first completed
  formal, as guest or host — `settleDueHolds` or attendance confirmation for
  non-credit seats), a `pending` referral becomes `earned` and the inviter
  gets +1 credit and `credit_earned`.
- Max 5 earned referrals per inviter; beyond that referrals are recorded but
  pay nothing. A formal reported "didn't happen" doesn't count.

### Seat links in group booking

- In "me + N", each extra seat can be "someone not on here yet". The
  requester picks who pays: "Me" (their credit/cash, like an unnamed guest) or
  "Them" (credit only — a new account's starter credit covers it).
- On send, each link seat gets a token; the requester sees
  `oxformals.com/s/[token]` to share.
- `/s/[token]`: shows the formal, the host, who invited them, and "Join to
  answer" (or sign in). After sign-in `claimSeatLink` turns the seat into a
  friend seat, makes them mutual friends, records a `seat` referral for new
  accounts, and lands them on the existing "I'm in" / "Not me" screen.
- The host can't accept while any link seat is unclaimed or pending (same
  rule as named friends).
- An unclaimed or unanswered link seat expires 48h after the request is sent;
  expiry drops the seat like "Not me" (the rest of the group can then be
  accepted). Withdrawing or declining the request expires all its links. A
  claimed or expired token can't be reused.

### People you may know

- `getPeopleYouMayKnow` (limit 10): candidates are friends-of-friends,
  same-college users, and people seated at the same formals in the last year.
  Score = 3 × mutual friends + 2 × shared formals + 1 × same college. Excludes
  yourself, anyone you follow or have requested, and deleted users. Private
  accounts can appear (following sends a request).
- Shown in the feed sidebar and in the empty Following state, with Follow
  buttons.

### Tests

Claim creates mutual follows and a pending referral only for new accounts;
own/invalid codes are no-ops; reward pays once on first completed formal,
respects the cap, skips disputed formals; seat link claim → friend seat →
"I'm in" → host can accept; expiry drops the seat; token reuse rejected; PYMK
ranking and exclusions.

## Out of scope

Contacts matching (needs the phone app), notification digests, browser push on
iPhone Safari outside home-screen installs, mobile app UI for the bell.
