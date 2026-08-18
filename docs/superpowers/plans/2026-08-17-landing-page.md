# Logged-out Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give logged-out visitors a real landing page at `/` — a split hero with live formals, how-it-works, and a social teaser — instead of dropping them straight into the Browse tab.

**Architecture:** A new `components/landing/` tree composed by `LandingPage`, rendered from `HomeClient` when unauthenticated. The hero's rail reuses the existing `ListingDayList` + `ListingRow` and is fed by one new lightweight Convex query, so the landing page never mounts `DataProvider`.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind v4 with CSS custom properties, Convex.

**Spec:** `docs/superpowers/specs/2026-08-17-landing-page-design.md`

## Global Constraints

- **Build only from existing design tokens** — `--bg`, `--paper`, `--ink`, `--ink-muted`, `--ink-soft`, `--tag`, `--tag-ink`, `--accent`, `--accent-hover`, `--accent-ink` — and existing font classes (`font-display`, inherited body font). No hardcoded hex, no Space Grotesk, no new palette values. The typography/colour revamp is agreed but unspecced; building on tokens means this page inherits it for free.
- **The primary CTA uses `text-[var(--accent-ink)]`, never `text-white`.** White on the pale pink `--accent` is 1.6:1 contrast; `--accent-ink` is the token for text-on-accent and gives 11:1 in the default theme. 34 existing places get this wrong — do not add a 35th.
- `oxformals` and `oxformals-mobile` share one Convex deployment and their `convex/schema.ts` files are byte-identical. **Any change under `convex/` must be copied to `/Users/nobel/Desktop/Work/oxformals-mobile/convex/` in the same commit**, and the two files must remain identical afterwards.
- Components use `@/...` alias imports; files under `lib/data/` import siblings relatively.
- Client components need `"use client"` on line 1.
- Tests run with `npx tsx --test <file>`. Do not add a `test` script or a devDependency.
- Verify with `npx tsc --noEmit` and `npm run lint` before each commit. Two pre-existing `.next/types/*` typecheck errors and a lint baseline of 33 problems (19 errors, 14 warnings) exist in files this work does not touch — add none.
- Do **not** modify `ListingRow`, `ListingDayList`, `components/swap/Hero.tsx`, or `SignInGate`.
- Commit on the current branch (`revival`). Do not push, do not merge.

---

## File Structure

**Create:**
- `convex/listings.ts` → new `listUpcomingPublic` query (modify) and a new index in `convex/schema.ts` (modify)
- `lib/data/mapConvex.ts` — shared Convex-doc → domain-type mappers, extracted from `DataProvider`
- `components/landing/LandingHero.tsx`
- `components/landing/LandingHowItWorks.tsx`
- `components/landing/LandingSocialTeaser.tsx`
- `components/landing/LandingPage.tsx`
- `lib/ui/routes.ts` — the browse route constant

**Modify:**
- `convex/schema.ts` — add `by_status_and_dateTime` index (+ mirror)
- `convex/listings.ts` — add `listUpcomingPublic` (+ mirror)
- `components/data/DataProvider.tsx` — import the extracted mappers instead of defining them
- `app/HomeClient.tsx` — render `LandingPage` when unauthenticated

---

### Task 1: `listUpcomingPublic` query

**Files:**
- Modify: `convex/schema.ts` (listings indexes)
- Modify: `convex/listings.ts`
- Mirror both into: `/Users/nobel/Desktop/Work/oxformals-mobile/convex/`

**Interfaces:**
- Consumes: existing `enrichListing` from `./listingHelpers`.
- Produces: `api.listings.listUpcomingPublic({ limit?: number })` → array of enriched listing docs (`Doc<"listings"> & { menuPdfUrl, menuFileContentType }`), soonest first, `status === "active"`, `dateTime` in the future.

- [ ] **Step 1: Add the index**

In `convex/schema.ts`, the `listings` table currently ends with:

```ts
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_status", ["status"])
    .index("by_college_and_status", ["college", "status"]),
```

Add one more:

```ts
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_status", ["status"])
    .index("by_college_and_status", ["college", "status"])
    .index("by_status_and_dateTime", ["status", "dateTime"]),
```

This is safe as a range query because `convex/listings.ts:223` normalises every write with `new Date(timestamp).toISOString()`, so all `dateTime` values are uniform UTC ISO strings and sort lexicographically in chronological order.

- [ ] **Step 2: Add the query**

In `convex/listings.ts`, directly after the existing `listListings` query (around line 127), add:

```ts
/**
 * Upcoming open formals for the logged-out landing page. Deliberately narrow:
 * the landing page must not pay for `listListings` (200 docs) plus
 * `users.listPublic` (500 docs) to render a handful of rows.
 */
export const listUpcomingPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    const nowIso = new Date().toISOString();
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status_and_dateTime", (q) =>
        q.eq("status", "active").gt("dateTime", nowIso),
      )
      .order("asc")
      .take(limit);
    return Promise.all(listings.map((listing) => enrichListing(ctx, listing)));
  },
});
```

`v` and `enrichListing` are already imported in this file — confirm before adding imports.

- [ ] **Step 3: Mirror into the mobile repo**

```bash
cp convex/schema.ts /Users/nobel/Desktop/Work/oxformals-mobile/convex/schema.ts
cp convex/listings.ts /Users/nobel/Desktop/Work/oxformals-mobile/convex/listings.ts
diff -q convex/schema.ts /Users/nobel/Desktop/Work/oxformals-mobile/convex/schema.ts
```

Expected: `diff` prints nothing (files identical).

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors beyond the documented baseline.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/listings.ts
git commit -m "FEAT: Upcoming-formals query for the landing page"
```

Note the mobile repo is a separate git repo — leave its working tree dirty and report that you did, so the controller can commit it there.

---

### Task 2: Extract the Convex mappers

**Files:**
- Create: `lib/data/mapConvex.ts`
- Modify: `components/data/DataProvider.tsx:89-132`

**Interfaces:**
- Produces: `mapUser(doc): User` and `mapListing(doc): Listing`, plus the `PublicUserDoc` and `ConvexListingDoc` types, all exported.
- Consumed by: `DataProvider` (this task) and `LandingHero` (Task 3).

Pure move, no behaviour change: `LandingHero` needs the same Convex-doc → domain-type conversion that `DataProvider` does privately, and duplicating it would guarantee drift.

- [ ] **Step 1: Create the module**

Create `lib/data/mapConvex.ts` containing exactly the `PublicUserDoc` type, `mapUser`, `ConvexListingDoc` type, and `mapListing` currently defined in `components/data/DataProvider.tsx` (lines ~80–132), with `export` added to each. Copy the bodies verbatim — do not "improve" them. Imports they need: `Doc` from `@/convex/_generated/dataModel`, `User` from `@/lib/auth/types`, `Listing` from `./types`, `DEFAULT_UI_FONT` from `@/convex/uiFont`.

- [ ] **Step 2: Update DataProvider**

Delete those four declarations from `components/data/DataProvider.tsx` and import instead:

```tsx
import { mapListing, mapUser } from "@/lib/data/mapConvex";
```

Keep every call site unchanged. If `PublicUserDoc` or `ConvexListingDoc` are referenced elsewhere in the file, import them too.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors. A type error here means the move dropped something — fix the move, do not add casts.

- [ ] **Step 4: Commit**

```bash
git add lib/data/mapConvex.ts components/data/DataProvider.tsx
git commit -m "REFACTOR: Extract Convex document mappers for reuse"
```

---

### Task 3: `LandingHero`

**Files:**
- Create: `components/landing/LandingHero.tsx`
- Create: `lib/ui/routes.ts`

**Interfaces:**
- Consumes: `api.listings.listUpcomingPublic` (Task 1); `mapListing`, `mapUser` (Task 2); existing `ListingDayList`, `ListingRow`, `api.users.getPublicByIds`.
- Produces: `<LandingHero />`, no props.

- [ ] **Step 1: Add the route constant**

Create `lib/ui/routes.ts`:

```ts
/**
 * Where "Browse all formals" points. Lives here because the four-tab IA change
 * may replace the query param with a real route — one edit, not a search.
 */
export const BROWSE_ROUTE = "/?tab=browse";
```

- [ ] **Step 2: Write the hero**

Create `components/landing/LandingHero.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListingDayList } from "@/components/swap/ListingDayList";
import { ListingRow } from "@/components/swap/ListingRow";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import { BROWSE_ROUTE } from "@/lib/ui/routes";

const RAIL_LIMIT = 5;

export function LandingHero() {
  const docs = useQuery(api.listings.listUpcomingPublic, { limit: RAIL_LIMIT });
  const ownerIds = docs ? [...new Set(docs.map((d) => d.ownerUserId))] : [];
  const ownerDocs = useQuery(
    api.users.getPublicByIds,
    docs && ownerIds.length > 0 ? { userIds: ownerIds } : "skip",
  );

  const listings = docs?.map(mapListing) ?? [];
  const owners = new Map(
    (ownerDocs ?? []).map((doc) => [doc._id as string, mapUser(doc)]),
  );

  const loading = docs === undefined;
  const isEmpty = !loading && listings.length === 0;

  return (
    <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:gap-14">
      <div className="flex flex-col items-start">
        <h1 className="font-display text-5xl uppercase leading-none tracking-wider sm:text-6xl">
          oxformals
        </h1>
        <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Find a seat at any Oxford formal.
        </h2>
        <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-[var(--ink-muted)]">
          Swap your place, take an empty seat, and eat somewhere you&rsquo;ve
          never been.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-base font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Sign in with Oxford email
          </Link>
          <Link
            href={BROWSE_ROUTE}
            className="inline-flex items-center justify-center rounded-full border-[2px] border-[var(--ink)] px-6 py-3 text-base font-semibold text-[var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
          >
            Browse formals
          </Link>
        </div>

        <p className="mt-4 text-sm text-[var(--ink-soft)]">
          Oxford students only &middot; verified with your{" "}
          <code className="text-[0.85em]">@ox.ac.uk</code> email
        </p>
      </div>

      <div className="rounded-[16px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)]">
            Open right now
          </span>
          <Link
            href={BROWSE_ROUTE}
            className="text-sm text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Browse all formals &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="min-h-[16rem]" aria-hidden />
        ) : isEmpty ? (
          <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
            <p className="text-base text-[var(--ink-muted)]">
              No open formals right now.
            </p>
            <Link
              href="/login"
              className="rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm font-semibold"
            >
              Sign in to list yours
            </Link>
          </div>
        ) : (
          <div className="min-h-[16rem]">
            <ListingDayList
              listings={listings}
              renderRow={(listing) => {
                const owner = owners.get(listing.ownerUserId);
                if (!owner) return null;
                return (
                  <ListingRow
                    listing={listing}
                    owner={owner}
                    hideInterests
                    disabled
                    disabledLabel="Sign in to request"
                  />
                );
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
```

The rail area holds `min-h-[16rem]` in all three states so the hero does not jump when data arrives.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors. If `getPublicByIds` returns a shape `mapUser` rejects, read `convex/users.ts:152` and adapt the call — do not cast.

- [ ] **Step 4: Commit**

```bash
git add components/landing/LandingHero.tsx lib/ui/routes.ts
git commit -m "FEAT: Landing hero with live formals rail"
```

---

### Task 4: `LandingHowItWorks` and `LandingSocialTeaser`

**Files:**
- Create: `components/landing/LandingHowItWorks.tsx`
- Create: `components/landing/LandingSocialTeaser.tsx`

**Interfaces:**
- Consumes: nothing — both are static.
- Produces: `<LandingHowItWorks />` and `<LandingSocialTeaser />`, no props.

Both are static by design: the feed does not exist yet, and populating the teaser with real data would misrepresent a feature that has not shipped.

- [ ] **Step 1: How it works**

Create `components/landing/LandingHowItWorks.tsx`:

```tsx
const STEPS = [
  {
    title: "List your formal",
    body: "Post a seat at your college — a swap, or a paid guest place.",
  },
  {
    title: "Request a seat",
    body: "Ask to swap yours for theirs, or just take an open place.",
  },
  {
    title: "Go somewhere new",
    body: "Meet your host, eat, then rate the hall you visited.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="border-t-[2px] border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] py-10">
      <h2 className="font-display text-3xl uppercase tracking-wide">
        How it works
      </h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-5"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">
              {index + 1}
            </span>
            <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Social teaser**

Create `components/landing/LandingSocialTeaser.tsx`:

```tsx
export function LandingSocialTeaser() {
  return (
    <section className="grid items-center gap-8 border-t-[2px] border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] py-10 md:grid-cols-2">
      <div>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Follow people, not just formals
        </h2>
        <p className="mt-3 max-w-[44ch] text-base leading-relaxed text-[var(--ink-muted)]">
          See where the people you follow have eaten, what they thought of it,
          and get told when someone lists a formal at a college on your
          wishlist.
        </p>
      </div>

      <div className="flex flex-col gap-3" aria-hidden>
        <div className="rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent)] text-[0.7rem] font-bold text-[var(--accent-ink)]">
              SA
            </span>
            <span>
              <b>Sasa</b> reviewed <b>Worcester</b>
            </span>
          </div>
          <p className="mt-2 text-sm italic text-[var(--ink-muted)]">
            &ldquo;Best hall of the term — go for the guest night if you can get
            one.&rdquo;
          </p>
        </div>
        <div className="rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent)] text-[0.7rem] font-bold text-[var(--accent-ink)]">
              JO
            </span>
            <span>
              <b>Jonah</b> listed a formal at <b>Magdalen</b>
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            On your wishlist &middot; 3 seats left &middot; 20 Oct
          </p>
        </div>
      </div>
    </section>
  );
}
```

The mock cards carry `aria-hidden` on their container: they are illustrations of a feature, not real content, and should not be read out as if someone actually posted them.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/landing/LandingHowItWorks.tsx components/landing/LandingSocialTeaser.tsx
git commit -m "FEAT: Landing how-it-works and social teaser sections"
```

---

### Task 5: `LandingPage` and route wiring

**Files:**
- Create: `components/landing/LandingPage.tsx`
- Modify: `app/HomeClient.tsx:60-87`

**Interfaces:**
- Consumes: `LandingHero`, `LandingHowItWorks`, `LandingSocialTeaser`.
- Produces: `<LandingPage />`, rendered by `HomeClient` when unauthenticated.

- [ ] **Step 1: The orchestrator**

Create `components/landing/LandingPage.tsx`:

```tsx
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingSocialTeaser } from "@/components/landing/LandingSocialTeaser";

export function LandingPage() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <LandingHowItWorks />
      <LandingSocialTeaser />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `app/HomeClient.tsx`, add the import:

```tsx
import { LandingPage } from "@/components/landing/LandingPage";
```

Then, inside the `content` `useMemo`, make the landing the unauthenticated default **before** the browse branch:

```tsx
  const content = useMemo(() => {
    if (!isAuthenticated && tab === "browse" && !urlTab) {
      return <LandingPage />;
    }
    if (tab === "browse") {
      return (
```

Leave every other branch untouched. The `!urlTab` condition is what keeps `/?tab=browse` reaching the real Browse tab — that is exactly where the landing page's own "Browse formals" and "Browse all formals →" links point, so without it those links loop back to the landing page.

`urlTab` is already in scope (`app/HomeClient.tsx:24`). Add it to the `useMemo` dependency array alongside the existing entries.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 4: Verify in the browser**

Start the dev server and check, logged out:

- `/` shows the landing page: split hero, live rail on the right at `md` and up, how-it-works, social teaser.
- Both "Browse formals" and "Browse all formals →" reach the real Browse tab and do **not** bounce back to the landing page.
- "Sign in with Oxford email" reaches `/login`.
- The CTA's text colour is `--accent-ink`, not white — confirm by computed style, not by eye.
- At 375px wide the hero stacks copy-first and the rail sits below it.
- Console has no errors.

Report what you observed for each. Do not claim any of them without checking.

- [ ] **Step 5: Commit**

```bash
git add components/landing/LandingPage.tsx app/HomeClient.tsx
git commit -m "FEAT: Serve the landing page to logged-out visitors"
```

---

## Self-Review Notes

Spec coverage: split hero with live rail and empty/loading states (T3), how-it-works and static social teaser (T4), route conditional and browse-route constant (T3 + T5), the dedicated lightweight query avoiding `DataProvider` (T1), row reuse with no changes to `ListingRow`/`ListingDayList` (T3), `--accent-ink` on the CTA (T3, T4), mobile-repo schema mirror (T1). `components/swap/Hero.tsx` and `SignInGate` are untouched, as the spec requires.
