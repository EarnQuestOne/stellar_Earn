# Admin quest table performance

The admin quest table (`components/admin/QuestTable.tsx`) previously rendered
the full quest list at once and rebuilt the row action handlers for every row on
every render, which made the admin surface slow and janky as the quest count
grew. This document describes the optimization, the regression tests, and the
measured before/after numbers.

## What changed

1. **Client-side pagination.** `QuestTable` now renders a single page of rows
   (10 / 25 / 50 / 100 per page, default 10) with Previous / Next controls, a
   page indicator, and a "Showing X–Y of Z" range readout. The page resets to 1
   whenever the `quests` prop changes identity (i.e. when the parent filters,
   sorts, or refetches), so users never land on an empty page.
2. **Memoized rows.** Each row was extracted into a `React.memo`'d
   `QuestTableRow`, and `QuestRowActions` is also wrapped in `React.memo`. A
   selection toggle or sort change therefore only re-renders the rows whose
   props actually changed.
3. **Stabilized callbacks.** The handlers passed down to the rows
   (`onToggleSelect`, `onEdit`, `onDelete`) are wrapped in `useCallback`, so the
   memoized rows are not invalidated by incidental re-renders of the table.

`QuestTableProps` is unchanged, so `QuestManager` and the admin page needed no
changes.

## Measured impact

Benchmarked with
[`scripts/benchmarks/quest-table.render.bench.tsx`](../scripts/benchmarks/quest-table.render.bench.tsx)
in jsdom: mount time (initial render of `N` quests) and update time
(re-render after a single-row selection change), best-of-3. Raw results:

- Baseline: [`scripts/benchmarks/results/quest-table.baseline.json`](../scripts/benchmarks/results/quest-table.baseline.json)
- Optimized: [`scripts/benchmarks/results/quest-table.optimized.json`](../scripts/benchmarks/results/quest-table.optimized.json)

| Dataset     | Metric           | Before    | After    | Speed-up               |
| ----------- | ---------------- | --------- | -------- | ---------------------- |
| 200 quests  | Mount            | 237.84 ms | 22.79 ms | ~10x                   |
| 200 quests  | Selection update | 181.18 ms | 7.97 ms  | ~23x                   |
| 1000 quests | Mount            | 856.12 ms | 15.13 ms | ~57x                   |
| 1000 quests | Selection update | 535.67 ms | 7.31 ms  | ~73x                   |
| 1000 quests | Rows mounted     | 1000      | 10       | flat (page-size bound) |

The important property is that the cost is now **flat**: mounting 1000 quests is
no more expensive than mounting 200, because only one page of rows is ever
rendered and unchanged rows are never re-rendered.

## Re-running the benchmark

```bash
# Baseline (before optimization) is preserved in the repo for comparison.
cd FrontEnd/my-app
npm run benchmark:quest-table   # writes scripts/benchmarks/results/quest-table.latest.json
```

Set `QUEST_TABLE_BENCH_OUT` / `QUEST_TABLE_BENCH_LABEL` to write to a custom
location (used to produce the committed baseline/optimized files).

## Regression tests

- `components/admin/__tests__/QuestTable.pagination.test.tsx` — verifies
  page-size-bound rendering, Previous / Next navigation, boundary disabling,
  page reset on new `quests`, page-size changes, and that the footer is absent
  for loading / empty states.
- `components/admin/__tests__/QuestTable.memo.test.tsx` — verifies that
  changing the selection re-renders only the affected row, and that changing
  the callback identities re-renders all rows (guarding against over-memoizing).
