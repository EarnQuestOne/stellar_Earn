# API & render performance optimizations

Four related performance improvements to reduce redundant network work and
wasted re-render computation.

## 1. In-flight GET coalescing (#2053)

`lib/api/client.ts` now coalesces concurrent identical GETs. `get<T>()` keys a
request by URL + serialized params; while one is in flight, further identical
GETs share the same promise instead of each hitting the network. The entry is
cleared when the promise settles, so later requests still refetch. Requests
carrying an `AbortSignal` bypass coalescing so one caller aborting cannot cancel
another's request. Exposed as `coalesceRequest(key, run)` and unit tested.

**Measuring:** trigger several components that request the same resource on
mount and count network calls in the Network panel — duplicates collapse to one.

## 2. Prefetch quest detail on hover/focus (#2056)

`components/quest/QuestCard.tsx` prefetches quest detail data on `mouseenter`
and `focus` via the cached `getQuestById`, so clicking through to the detail
page hits a warm cache instead of a cold fetch. It runs once per card and is a
no-op if already prefetched.

**Measuring:** hover a card, then navigate — compare time-to-content against a
cold navigation in a React Profiler / Network trace.

## 3. Memoized dashboard derivations (#2038)

`components/dashboard/EarningsChart.tsx` computed its aggregates
(`maxAmount`, `totalEarnings`, `avgEarnings`, plus the highest/lowest summary)
on every render — some several times per render. These are now derived once in
a single `useMemo` keyed on `earnings`.

**Measuring:** profile the dashboard while an unrelated state change re-renders
the chart — the aggregate computations no longer re-run.

## 4. Batched profile reads (#2058)

`lib/api/profile.ts` adds `fetchProfileOverview(address)`, which fetches the
profile, achievements, and activities in parallel via `Promise.all` rather than
as separate scattered/sequential requests. Combined with the GET coalescing
above, the profile page issues fewer, better-batched requests.

**Measuring:** load a profile and compare the request waterfall — the related
reads run concurrently instead of one-after-another.
