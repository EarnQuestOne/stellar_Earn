# Submission-History Keyset Pagination

## Problem

`GET /quests/:questId/submissions` lists submissions for a quest. When a
`userId` filter is applied it becomes the "user submission history" query:

```sql
SELECT * FROM submissions
WHERE "questId" = :questId AND "userId" = :userId
ORDER BY "createdAt" DESC, id DESC
LIMIT 20;
```

Historically this endpoint used offset pagination (`OFFSET n`). Deep pages
forced the database to scan, sort, and discard the first `n` rows on every
request, so latency grew linearly with page depth as the `submissions` table
grew.

## Change

1. **Composite index** — migration `1820000000200-add-submission-user-created-at-index`
   guarantees the composite index
   `idx_submissions_user_created_at_id ON submissions ("userId", "createdAt" DESC, id DESC)`.
   The `id` tiebreaker is part of the index because keyset cursors page
   through `(createdAt, id)` tuples. The migration is idempotent
   (`CREATE INDEX IF NOT EXISTS`) because the earlier
   `1800000000006-add-cursor-pagination-indexes` migration may already have
   created the same index on environments with full migration history.

2. **Keyset pagination** — `SubmissionsService.findByQuest` in
   `src/modules/submissions/submissions.service.ts` replaces offset pagination
   with a composite row-comparison predicate:

   ```
   WHERE ... AND (createdAt, id) < (:cv, :idv)   -- DESC (default)
   WHERE ... AND (createdAt, id) > (:cv, :idv)   -- ASC
   ```

   Row comparisons translate directly into an index range condition, so each
   page walks exactly `limit + 1` index entries regardless of depth. (The
   `OR`-based `createdAt < cv OR (createdAt = cv AND id < idv)` formulation
   was rejected during development: the planner treats it as a post-scan
   `Filter` instead of an `Index Cond`, so deep pages still skip rows.)

3. **Opaque `nextCursor`** — the response wraps items in
   `PaginatedResponseDto`; the `nextCursor` field is a base64 payload encoding
   `{ [sortBy], id }` of the last returned row. Clients pass it back as the
   `cursor` query parameter. Older cursors that only encoded
   `{ createdAt, id }` continue to work via a decode fallback.

4. **Correct sort/order handling** — the predicate now follows the `sortBy`
   (`createdAt`/`updatedAt`) and `order` (`ASC`/`DESC`) query options instead
   of being hard-coded to `createdAt DESC`.

## Before / After

Benchmark: `scripts/benchmark-submission-pagination.ts` (100k submissions for
one user, page size 20, `EXPLAIN (ANALYZE, BUFFERS)`, best of 3).

Run it with:

```bash
cd BackEnd
pnpm benchmark:submission-pagination            # index present
pnpm benchmark:submission-pagination --seed     # re-seed the dataset
pnpm benchmark:submission-pagination --drop-index  # measure without the index
```

### With the composite index present (offset vs keyset)

| page depth | offset (ms) | keyset (ms) | speedup |
|-----------:|------------:|------------:|--------:|
| 0          | 0.034       | 0.032       | 1.1×    |
| 10,000     | 3.509       | 0.024       | 146×    |
| 25,000     | 5.324       | 0.035       | 152×    |
| 50,000     | 10.044      | 0.039       | 258×    |
| 90,000     | 12.760      | 0.042       | 304×    |

Buffer blocks touched at depth 90,000: offset 646 → keyset 5.

### Without the supporting index (the true "before")

Offset pagination without `idx_submissions_user_created_at_id` degrades much
more sharply (sequential scan + sort):

| page depth | offset, no index (ms) | keyset (ms) | speedup |
|-----------:|----------------------:|------------:|--------:|
| 10,000     | 4.395                 | 0.046       | 96×     |
| 50,000     | 21.422                | 0.042       | 510×    |
| 90,000     | 57.845                | 0.048       | 1205×   |

Key observation: offset latency scales with page depth; keyset latency is flat
(O(limit)) at every depth. The composite index converts the deep-page path
from "scan and skip" into a constant-cost index walk.

## Files

- `src/database/migrations/1820000000200-add-submission-user-created-at-index.ts`
- `src/modules/submissions/submissions.service.ts` (`findByQuest`,
  `buildKeysetPredicate`)
- `src/modules/submissions/submissions.service.spec.ts` (keyset regression tests)
- `scripts/benchmark-submission-pagination.ts`
- `scripts/verify-indexes.ts` (expected-index check)