# Booking, credits and follows — design

Agreed with the user on 2026-09-29. The problem: more people want to attend
formals than offer them, because hosting has little incentive. Group booking
("bring friends") sits on top of three supporting pieces. Five slices, shipped
in order, each usable on its own.

## Shared data model

- A **seat belongs to a listing** (the host's guest allowance), never to a
  person. `seatsAvailable = groupSize − members.length − Σ guestSeats.count`.
- `listings.guestSeats?: { userId, count }[]` — unnamed "+N" guests, keyed by
  the member who brought them.
- `requests.party?: SeatLine[]` — one entry per seat asked for (≤ 5 guests +
  requester, bounded by `groupSize`). Legacy requests without `party` are one
  seat for the requester paid by `requestType`.
  - `SeatLine = { kind: "requester" | "friend" | "guest", userId?, payerId,
    method: "swap" | "pay" | "credit", response?: "pending" | "in" | "out" }`.
- `requests.requestType` gains `"credit"` and `"group"` (mixed); a
  `status` of `"declined"` also covers undone swaps.

## Slice 1 — swap integrity

The two halves of a swap (the accepted request with an `offeringListingId`)
now stand or fall together.

- **Linked undo.** When a swap partner leaves, is removed, or either listing is
  cancelled, the counterpart seat on the other listing is released too, and
  everyone affected is emailed. If the other formal has already happened the
  seat can't be taken back: the break is recorded in `swapBreaks` and emailed
  to team@oxformals.com.
- **Locked once joined.** `updateListing` refuses a date change once anyone
  besides the host has joined.
- **Cancel, not delete.** Deleting an upcoming listing with guests is
  "Cancel formal": guests are removed and emailed, linked swaps undone. Past
  listings delete as before.

## Slice 2 — seat credits

- `creditAccounts { userId, balance }`; a user without a row has the
  1 starter credit (the row is created lazily on first spend, once per person).
- Credits are accepted on every listing (a request type, not a listing type).
  1 credit = 1 seat everywhere; credits never expire.
- `creditHolds { requestId, listingId, payerId, hostId, seats, status:
  "held" | "paid" | "refunded" | "disputed", releaseAt }`. The payer's credits
  move into a hold when the host accepts; a cron pays the host
  24 hours after the formal unless the guest reported "didn't happen"
  (`disputed`, emailed to the team). Cancellation or removal before the formal
  refunds the hold.
- Only credit-paid guests earn the host credits (swap and cash guests don't).

## Slice 3 — group booking v1 ("me + N")

- A request can ask for 1 + N seats (N unnamed guests), all paid the same way
  by the requester: credits (1 + N), cash (price × seats), or swap.
- **Group swap = seats for seats.** The requester's offering listing must have
  1 + N free seats; on accept the host joins it and holds up to N guest seats
  there (`guestSeats`), which they can release.
- The host sees "Alice + 2 guests" and accepts or declines the whole request.

## Slice 4 — follows and private accounts

- `follows { followerId, followeeId, status: "active" | "pending" }`.
  Following is instant unless the followee is private (`users.isPrivate`),
  then it waits for approval. Mutual active follows are "friends".
- A private account's reviews, attended formals, badges and feed items are
  hidden from non-followers (their reviews on college pages show as
  "A private member"). Name, photo, college, bio and listings stay public.

## Slice 5 — named friends and mixed payment

- The requester can name mutual follows in the party. The request goes to the
  host straight away; each named friend is emailed and can tap "Not me",
  which drops their seat.
- Each seat has a payer and method. Default: every named friend pays their own
  credit and the requester covers themselves and any guests; "Edit payment"
  opens the per-seat table. A friend paying their own credit must tap "I'm in"
  before the host can accept (that tap authorises the hold).
- Host summary: "4 seats · 1 swap seat · 2 credits · £25".
