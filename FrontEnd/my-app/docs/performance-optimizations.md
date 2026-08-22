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

## 6. Memoized WalletContext value (#2149)

`context/WalletContext.tsx` used to allocate a brand-new context `value`
object (plus fresh `connect`/`disconnect`/`openModal`/`closeModal`/
`signMessage`/`signTransaction` callback identities and a fresh
`supportedWallets` array) on **every** provider render. Because Object.is on
the old value always failed, every component calling `useWallet()` re-rendered
whenever the provider re-rendered — even when no wallet state the consumer
reads had changed.

The provider now:

- wraps the context value in `useMemo`, keyed on the exact exposed wallet
  state fields (`address`, `isConnected`, `isConnecting`,
  `isVerifyingWallet`, `selectedWalletId`, `isModalOpen`, `walletError`) and
  the stabilized callbacks;
- stabilizes all callbacks with `useCallback`;
- hoists the static `supportedWallets` catalogue to module scope.

The provider still re-renders when any subscribed store slice changes, but
consumers now bail out unless something they actually read got a new identity.
Stable callback/array identities also let downstream `React.memo` components
and hook dependency arrays work as intended (e.g. a memoized button that only
takes `onConnect` no longer re-renders on unrelated wallet-state churn).

**Before/after (unit regression + benchmark, Vitest —
`context/WalletContext.memo.test.tsx`):** 100 provider re-renders with
unchanged wallet state (jsdom, React 19):

| Metric                                       | Before | After     |
| -------------------------------------------- | ------ | --------- |
| Consumer commits for 100 provider re-renders | 101    | 1         |
| Benchmark wall-clock time                    | ~79 ms | ~48–65 ms |

The committed test asserts the "after" behaviour exactly (1 commit), so any
future change that re-introduces per-render value allocation fails CI.
