# Oxformals

**Find your next formal.**

A seat-swap platform for University of Oxford formal dinners. Students list their college formals, browse available seats at other colleges, and request swaps — offering a seat at their own formal in return.

## Features

- **Oxford-only authentication** — sign in with an `@ox.ac.uk` email via one-time passcode
- **List your formal** — publish your college formal with date, time, group size (2–4), and a message
- **Browse & filter** — find formals by college, with wishlist-based defaults and popular-college highlights
- **Request swaps** — offer one of your own listings in exchange for a seat at someone else's formal
- **Auto-matching** — if both sides have requested each other's listings, the swap is confirmed automatically
- **Group management** — owners can remove members; members can leave
- **College wishlist** — save preferred colleges for quick filtering
- **User profiles** — name, college, year, role, interests, Instagram, and WhatsApp
- **Hand-drawn aesthetic** — sketch-style card borders (roughjs), handwriting font (Schoolbell), warm parchment tones with dark mode support

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Convex** — real-time reactive backend and database
- **Convex Auth** + **Resend** — OTP email authentication
- **Tailwind CSS v4** — styling
- **roughjs** — hand-drawn sketch borders
- **TypeScript** — strict throughout

## Project Structure

```
app/                  → Pages and layouts (Next.js App Router)
  login/              → Login and onboarding flow
  requests/[listingId]/ → Listing detail and request management
  profile/[userId]/   → Public user profiles
components/
  auth/               → Auth context, hooks, route guards
  data/               → Data context wrapping Convex queries/mutations
  onboarding/         → Post-signup onboarding overlay
  swap/               → Core feature components (browse, listings, requests, profiles)
  ui/                 → Shared primitives (Avatar, Chip, Modal, SketchCard)
convex/               → Backend schema, auth config, queries, and mutations
lib/
  auth/               → Auth types and client helpers
  data/               → Data types, college list, formatting utilities
public/               → Static assets (logo, fonts, SVGs)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account
- A [Resend](https://resend.com) API key

### Environment variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_CONVEX_URL=<your Convex deployment URL>
AUTH_RESEND_KEY=<your Resend API key>
CONVEX_SITE_URL=<your app's domain, e.g. http://localhost:3000>

# Optional: /letter newsletter CTAs (iOS + Android links are hardcoded in lib/letter/newsletterLinks.ts)
NEXT_PUBLIC_NEWSLETTER_INSTAGRAM_URL=
```

### Install and run

```bash
npm install
npx convex dev    # start the Convex backend and push the schema
npm run dev       # start the Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## License

Private project — not licensed for redistribution.
