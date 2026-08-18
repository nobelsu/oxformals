# Loading delay — diagnosis (not yet fixed)

Date: 2026-08-18
Status: findings only; deferred behind feed / follow-graph work.

## Symptom

Pages flash empty, then content pops in after a beat.

## Root cause

The app ships a **content-less HTML shell** and fetches everything on the client.

- Server-rendered HTML for `/` contains none of the page content — verified with
  `curl http://localhost:3000/ | grep` for "Find a seat", "Open right now",
  "WORCESTER": zero matches.
- 21 `useQuery` call sites across `components/` and `app/`.
- **Zero** server-side data fetching: no `preloadQuery`, `fetchQuery`, or
  `preloadedQueryResult` anywhere.

So every visitor waits through a sequential client waterfall after the HTML lands:

```
HTML shell (no data)
  → JS downloads
  → React hydrates
  → Convex WebSocket connects
  → auth resolves (status → "ready")
  → useQuery returns
  → content appears
```

Four hops after the HTML arrives.

## Resolutions, ranked for this stack

1. **Server-render the data with Convex `preloadQuery`** (the real fix). Call
   `preloadQuery` in a Server Component, hand it to the client via
   `usePreloadedQuery`. HTML ships with the data in it; the client hydrates
   against data already present. No waterfall, no pop. Best candidates:
   the landing hero's `listUpcomingPublic`, and the tabbed home's first screen.

2. **Skeletons instead of blank space** (perceived performance) for genuinely
   per-user data that can't be preloaded. The hero already reserves
   `min-h-[16rem]`; extend that to layout-matched skeletons so the wait reads as
   intentional and nothing shifts.

3. **Stop over-blocking on auth.** `HomeClient`'s `status !== "ready" → return
   null` makes the whole page wait on auth, including static marketing copy and
   "How it works" that don't depend on the viewer. Paint the static shell
   immediately; gate only the auth-dependent branch.

4. **Shrink the payload.** `DataProvider` pulls ~700 docs unconditionally on
   every tabbed page (`users.listPublic` 500 + `listings.listListings` 200) — see
   the whole-branch review's Important finding #3. Less data resolves faster.

## Recommendation

#1 is the one that matters here — the landing hero and the authenticated home's
first screen are both preloadable, and that is where the delay is most visible.
#3 and #4 are cheap complements. #2 is a fallback for the truly per-user parts.

Deferred by choice on 2026-08-18: understand now, fix after the feed and
follow-graph work land, since the feed will add its own preloadable surfaces and
it is worth doing the preload pass once, across all of them.
