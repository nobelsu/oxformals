# Student card verification

Status: design approved in chat on 2026-10-15 (Nobel, after discussing with Juyeon). Not built.

## Goal

Let Oxford students who don't have an Oxford email address join, by photographing their Oxford University Card. People with an allowed email (Oxford or Stanford) are unaffected and never see this.

## Decisions

| Question | Decision |
|---|---|
| What it's for | An alternative way in for people without an allowed email |
| Who must do it | Only accounts whose email isn't an allowed domain |
| Which cards | Oxford University Card only |
| Who checks | OpenAI reads the card; clear passes are approved automatically; anything else goes to an admin |
| While waiting | Browse only |
| The photo afterwards | Deleted as soon as there's a decision |
| Admin review | A small admin page, linked from an email |
| Name check | The card's name must roughly match the name the person entered |

## The person's journey

1. **Login.** Any email address can request a sign-in code. If the address isn't an allowed domain, the login screen says before sending the code that a University Card photo will be needed.
2. **Profile steps** as today, then a new step for card accounts: "Photo of your University Card", using the camera or photo library (app) or a file picker that offers the camera on phones (website).
3. **Browse-only** after submitting. A banner reads "Checking your card. You can look around meanwhile." Actions listed under *Gating* are refused with a message pointing at the banner.
4. **Outcome.**
   - Approved: a notification ("You're in"), everything unlocks, and the profile's college is set from the card.
   - Rejected: a notification with the reason, and the card step is offered again.
5. **Retry limit:** three submissions per rolling 24 hours.

## Checking a card

1. The client uploads the image to Convex storage and calls `cardChecks.submit` with the storage id.
2. `submit` records a `pending` check and schedules an action that sends the image to OpenAI (vision-capable model, structured JSON output) asking for:
   - `isOxfordUniversityCard` (boolean)
   - `name` (string or null)
   - `college` (string or null)
   - `expiry` (ISO date or null)
   - `confidence` (`high` | `medium` | `low`)
3. **Auto-approve** only when every rule holds:
   - `isOxfordUniversityCard` is true and `confidence` is `high`
   - `expiry` is present and after today (Oxford time)
   - `college` matches an entry in `OXFORD_COLLEGES` (case-insensitive, ignoring "College", "Hall" and punctuation)
   - `name` roughly matches the profile name: after lowercasing and removing punctuation, every word of the shorter name appears as a whole word in the longer one ("Jeremy Smith" matches "Jeremy A. Smith"; "J Smith" and "Jem Smith" do not)
4. **Otherwise the check becomes `needs_review`** and the admin gets an email: "A University Card is waiting for review", with a link to the admin page. The email contains no photo or personal details.
5. **Clear failures are rejected automatically** without admin review: the model says it isn't a University Card with `high` confidence, or the expiry is in the past. The person sees the reason and can retry.
6. **If the OpenAI call fails** (no key, network, malformed output), the check goes to `needs_review` rather than failing the person.
7. **The photo is deleted** from storage the moment a check reaches `approved` or `rejected`. Only status, college, expiry, reason and timestamps are kept.

## Admin page

- Route `/admin/cards`, visible only to the user whose email equals `ADMIN_EMAIL` (`assertAdmin` in `convex/guards.ts`). Everyone else gets a not-found page.
- Lists `needs_review` checks oldest first. Each shows the photo, what the model read, the profile name, and Approve / Reject. Reject asks for a short reason from a fixed list (unreadable, expired, not an Oxford card, name doesn't match, other).
- The college on approval defaults to what the model read; the admin can change it from the college list before approving.

## Gating

A single helper `requireVerifiedMember(ctx)` in `convex/guards.ts` returns the user if they have an allowed email or an approved card check, and throws a `ConvexError("Your card is still being checked.")` otherwise. It is added to:

- `listings.createListing`, `listings.createRequest`, `listings.acceptRequest`
- `follows.follow`
- `chat.sendMessage`, `chat.getOrCreateConversation`, `chat.createGroupConversation`
- `feedComments.addComment`
- `collegeReviews.submitReview`, `collegeGuide.updateGuide`, `collegeGuide.addTip`
- `invites.claimInvite`, `seatLinks.claimSeatLink`
- `contacts.matchContacts`

Reads (feed, browse, colleges, profiles) stay open to signed-in browse-only users, subject to existing privacy rules. Card accounts are not shown in people search or "people you may know" until approved.

## Data

New table `cardChecks`:

| Field | Type | Notes |
|---|---|---|
| `userId` | `Id<"users">` | |
| `status` | `pending` \| `needs_review` \| `approved` \| `rejected` | |
| `imageId` | `Id<"_storage">` optional | Cleared when deleted |
| `read` | object optional | What the model returned |
| `college` | string optional | Set on approval |
| `expiry` | string optional | ISO date |
| `reason` | string optional | Shown to the person on rejection |
| `decidedBy` | `"auto"` \| `Id<"users">` optional | |
| `createdAt`, `decidedAt` | number | |

Indexes: `by_userId_and_createdAt`, `by_status_and_createdAt`.

No change to `users`: "verified" is derived from the email domain or the latest approved check.

## Sign-in change

`isOxfordEmail` in `convex/ResendOTP.ts`, `app/login/LoginForm.tsx` and the app's `src/app/login.tsx` becomes `isAllowedEmail` (unchanged list). The OTP provider stops refusing other addresses; the login forms show the card notice instead of an error for them.

## Notifications

Two new kinds, in the existing notification system and categories:
- `card_approved` (bell and push): "You're in. Your card checked out."
- `card_rejected` (bell and push): "We couldn't accept your card: {reason}. Try again."

Admin email: one per check that reaches `needs_review`, through `emails.ts` (respects `OUTBOUND_DISABLED`).

## Privacy and policy

- Privacy page: a "University Card" row: what is collected (a photo of the card), why (to confirm you're an Oxford student without an Oxford email), who sees it (OpenAI, to read it; the Oxformals admin if unclear), how long (deleted once checked; college and expiry kept).
- Account deletion and data export include `cardChecks` rows; deletion also removes any photo still in storage.
- Retention: a `pending` or `needs_review` photo older than 30 days is deleted and the check rejected as "expired, please try again".

## Mobile app

- Card step in sign-up and a "Verify your card" entry in Settings for rejected or pending accounts, using `expo-image-picker` (already installed; camera permission text added to `app.json`).
- Browse-only banner on the Feed and Browse tabs; actions show the backend's message.
- Backend changes reach the app through `npm run sync:backend`.

## Configuration

- `OPENAI_API_KEY` on production (already set on dev).
- `ADMIN_EMAIL` on production: set to `admin@ox.ac.uk` on 2026-10-15 (the existing admin login, whose sign-in codes go to nobel@suhendra.com). It is compared with the signed-in account's email.
- `CARD_CHECK_MODEL` optional, defaulting to a current OpenAI vision model.

## Testing

- Unit tests for the auto-approve rules: each failing rule, the name matcher's edge cases, college normalisation, expiry boundary in Oxford time.
- Backend tests: `submit` rate limit; gating on every listed mutation for pending, rejected and approved card accounts and for allowed-email accounts; photo deleted on approve and on reject; admin-only access to the review queries and mutations; account deletion removes checks and photos.
- The OpenAI call is mocked in tests. Real-card behaviour is checked by hand on dev with a few card photos before release.

## Out of scope

- Other universities' cards.
- Selfie or face matching against the card photo.
- Re-checking at card expiry.
