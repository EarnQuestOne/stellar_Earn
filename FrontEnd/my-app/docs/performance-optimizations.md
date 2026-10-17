# Frontend performance optimizations

This document describes four rendering/performance building blocks and where
they apply.

## 1. Virtualized long lists (#2035)

`components/ui/VirtualizedList.tsx` is a dependency-free windowing list: it
renders only the rows inside the scroll viewport (plus a small overscan)
instead of mounting every row, so paint time and scroll cost stay flat as data
grows.

`components/submission/SubmissionsList.tsx` now switches to windowed rendering
once a list exceeds `VIRTUALIZE_THRESHOLD` (40) rows. Shorter lists keep the
original flow layout, so existing behaviour is unchanged.

**Measuring:** render a submissions list of 500+ rows and compare mounted DOM
nodes in the React Profiler / Elements panel — windowing keeps the mounted row
count roughly constant (viewport + overscan) instead of scaling with the data.

## 2. Deferred hydration of below-the-fold widgets (#2066)

`components/ui/DeferHydration.tsx` mounts (and therefore hydrates) an
interactive widget only once it scrolls near the viewport, using
`IntersectionObserver`. The server and first client render both show a
placeholder, so there is no hydration mismatch; if `IntersectionObserver` is
unavailable it falls back to rendering the children.

Wrap heavy below-the-fold interactive sections:

```tsx
<DeferHydration>
  <HeavyInteractiveWidget />
</DeferHydration>
```

**Measuring:** compare Total Blocking Time / hydration time in a Lighthouse or
React Profiler trace with and without the wrapper on a page with several
below-the-fold widgets.

## 3. Suspense streaming + loading skeletons (#2037)

Added `loading.tsx` skeletons for the `submissions`, `dashboard`, and
`admin/quests` route segments (alongside the existing `quests` skeletons).
Next.js renders these instantly as a Suspense fallback while the segment's data
resolves, so the shell streams in immediately instead of blocking on data.

**Measuring:** throttle the network and compare First Contentful Paint / the
time until a non-blank screen appears for those routes.

## 4. Server-side quest data fetching (#2036)

`lib/server/questsServer.ts` fetches quests on the server (`getQuestsServer`,
plus the pure, unit-tested `buildQuestsSearchParams`). `components/quest/
QuestListServer.tsx` is a Server Component that awaits that data and renders it
without shipping fetching logic to the browser; drop it inside a `<Suspense>`
boundary to stream the list.

**Measuring:** compare the client JS bundle (via `npm run analyze`) and the
time-to-content for a server-rendered quests list versus the client-fetched
path.

## 5. Quest socket selective subscription + coalescing (#2059)

`lib/hooks/useQuestSocket.ts` keeps a single shared Socket.IO client but now:

- **Selective subscription:** each hook registers only the channels it needs
  (`quest:updated` when `onQuestUpdated` is passed, `submission:status` when
  `onSubmissionUpdated` is passed). Reference counts per quest/channel avoid
  duplicate server subscriptions when several components listen to the same
  quest.
- **Coalesced dispatch:** burst socket events for the same quest or submission
  are merged and flushed once per animation frame via `requestAnimationFrame`,
  so React state updates from handlers such as `QuestCard` / `SubmissionDetail`
  do not run once per raw packet.

**Before/after (unit regression, Vitest):** three `quest:updated` payloads in
one frame invoked the consumer callback **3× without coalescing** vs **1×**
with coalescing (`useQuestSocket.test.ts`). Selective subscription cuts
subscribe emits from **2 channels** to **1** when a component only listens for
quest or submission updates (e.g. quest cards no longer subscribe to
`submission:status`).

**Measuring in the app:** open React Profiler, trigger several rapid submission
status events (or replay socket traffic), and compare commit count with the
previous behaviour; network tab should show fewer redundant `subscribe` frames
on quest list pages that only refresh quest metadata.

## 6. In-flight lock in ClaimButton to guard against duplicate reward claims (#2150)

`components/rewards/ClaimButton.tsx` tracks an in-flight lock using `inFlightRef`
and an `isPending` state variable. Repeat clicks while a claim request is active
are synchronously ignored, preventing duplicate reward claim transactions,
unnecessary RPC/API load, and double-claim risks.

**Measuring:** run `npm run benchmark` (`scripts/benchmarks/claim-button.bench.tsx`),
which simulates click bursts on `ClaimButton` during pending transactions. The lock
reduces duplicate request dispatches by **90%** (10 clicks), **99%** (100 clicks), and
**99.9%** (1000 clicks), guaranteeing exactly 1 transaction dispatch per claim action.

## 7. Memoized BadgeGallery grid (#2497)

`components/reputation/BadgeGallery.tsx` rebuilt its grid and re-rendered every
badge on each render. The gallery now:

- derives the `{ badge, isEarned }` grid items with `useMemo`, keyed on the
  `badges` array and the earned-badge set, so an unrelated parent re-render does
  not rebuild the list;
- checks earned membership through a memoized `Set` instead of
  `Array.includes` inside the render loop, turning per-badge lookup from O(n)
  into O(1);
- passes a single stable `onClick` callback (`useCallback`) to every card and
  wraps `BadgeCard` in `React.memo`, so cards whose `badge`/`isEarned` are
  unchanged skip re-rendering; and
- memoizes the empty-state path and keeps the empty state cheap to render.

**Before/after (Vitest, `scripts/benchmarks/badge-gallery.bench.tsx`):**
mounting 1000 badges and then re-rendering with an unchanged earned set took
**~14 ms** with the memoized cards versus **~40 ms** with a non-memoized
baseline — roughly **2.7x faster updates** — because unchanged cards bail out
instead of re-rendering. At 200 badges the difference is within noise, which is
expected: the win scales with the number of unchanged cards.

**Measuring in the app:** open React DevTools → Profiler, re-render the
reputation page (e.g. toggle an unrelated filter), and confirm `BadgeCard`
commits drop to zero when the badge data has not changed.

## 8. Memoized global Header (#2498)

`components/layout/Header.tsx` is mounted once by `AppLayout` and stays on
screen for the whole session. It is now wrapped in `React.memo`, its callback
prop is stabilized with `useCallback` in `AppLayout`, the navigation slice is
derived with `useMemo`, and `useTranslatedNavigation` (`lib/config/navigation.ts`)
returns memoized arrays. Together these stop the heavy header subtree — global
search, notification bell, wallet connect, user menu, breadcrumbs — from
re-rendering when an ancestor re-renders for an unrelated reason (for example
opening the mobile menu).

**Before/after (Vitest, `scripts/benchmarks/render-coalescing.bench.tsx`):**
across 20 parent re-renders with unchanged props, the Header body rendered
**21× before** (once per parent render) versus **1× after** memoization —
**20 renders avoided**. The navigation still re-renders when the route or the
callback genuinely changes.

**Measuring in the app:** open React DevTools → Profiler, record a navigation
or a mobile-menu toggle, and confirm the `Header` commit count stops scaling
with unrelated ancestor state changes.

## 9. Debounced quest list filters (#2499)

`components/quest/QuestListFilters.tsx` previously invoked its `onChange`
handlers on every keystroke/selection, and each handler pushes a URL update in
`app/[locale]/quests/page.tsx`, which triggers a quest fetch. The component now
routes changes through per-control debounced emitters (`lib/utils/debounce.ts`)
using `DEFAULT_FILTER_DEBOUNCE_MS` from `lib/hooks/useQuestFilter.ts`, and the
hook itself debounces the applied criteria before recomputing the filtered
list. Controls stay responsive; only the expensive propagation is coalesced.

**Before/after (Vitest, `scripts/benchmarks/render-coalescing.bench.tsx`):**
20 rapid reward-range edits produced **20 callback dispatches before** versus
**1 after** debouncing — **19 redundant updates avoided** per burst. The same
coalescing is covered for the hook by `useQuestFilter.test.ts`.

**Measuring in the app:** type quickly into the reward range and watch the
Network tab — requests collapse to one per pause instead of one per keystroke.
