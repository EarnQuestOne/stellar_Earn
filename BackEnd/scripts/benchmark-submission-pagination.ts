import AppDataSource from '../src/database/data-source';

/**
 * Benchmark: submission-history pagination — offset vs keyset (cursor).
 *
 * Demonstrates the before/after impact of the `(userId, createdAt, id)`
 * composite index + keyset pagination described in the submissions module.
 * Offset pagination at deep pages must scan and discard `OFFSET n` rows;
 * keyset pagination walks the composite index so every page costs O(limit).
 *
 * Run:
 *   pnpm benchmark:submission-pagination            # seeded, index present
 *   pnpm benchmark:submission-pagination --seed     # force re-seed
 *   pnpm benchmark:submission-pagination --drop-index   # measure w/o index
 */

interface RunStats {
  planningMs: number;
  executionMs: number;
  buffers: string;
}

const PAGE_SIZE = 20;
const TOTAL_ROWS = 100_000;
const USER_ID = '11111111-1111-1111-1111-111111111111';
const QUEST_ID = '22222222-2222-2222-2222-222222222222';
const RUNS = 3;

const SUBMISSIONS_INDEX = 'idx_submissions_user_created_at_id';

async function explain(
  sql: string,
): Promise<{ planningMs: number; executionMs: number; buffers: string }> {
  const raw = await AppDataSource.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
  );
  const plan = raw[0]['QUERY PLAN'][0];
  const buffers =
    plan.Plan?.['Shared Hit Blocks'] !== undefined
      ? `read=${plan.Plan['Shared Read Blocks'] ?? 0} hit=${plan.Plan['Shared Hit Blocks']}`
      : 'n/a';
  return {
    planningMs: Number(plan['Planning Time']),
    executionMs: Number(plan['Execution Time']),
    buffers,
  };
}

async function bestOf(sql: string): Promise<RunStats> {
  let best: RunStats | null = null;
  for (let i = 0; i < RUNS; i++) {
    const s = await explain(sql);
    if (!best || s.executionMs < best.executionMs) best = s;
  }
  return best!;
}

function quote(value: string | number): string {
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

async function seed(force: boolean): Promise<void> {
  const [{ count }] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS count FROM submissions`,
  );
  if (!force && count > 0) {
    console.log(
      `Seeding skipped — ${count.toLocaleString()} submissions already present (use --seed to force).\n`,
    );
    return;
  }
  if (force) {
    await AppDataSource.query(`TRUNCATE submissions RESTART IDENTITY CASCADE`);
  }
  console.log(
    `Seeding ${TOTAL_ROWS.toLocaleString()} submissions for user ${USER_ID} …`,
  );
  // FK targets (submissions references users + quests). Upsert so repeated
  // runs with --seed never collide with existing rows.
  await AppDataSource.query(
    `INSERT INTO users (id, role, xp, level, "createdAt", "updatedAt")
     VALUES (${quote(USER_ID)}, 'USER', 0, 1, now(), now())
     ON CONFLICT (id) DO NOTHING`,
  );
  await AppDataSource.query(
    `INSERT INTO quests (id, title, description, "contractTaskId", "rewardAsset", "rewardAmount", status, "verifierType", "verifierConfig", "createdBy", "createdAt", "updatedAt")
     VALUES (${quote(QUEST_ID)}, 'benchmark', 'benchmark', 'bench', 'XLM', 1, 'ACTIVE', 'single', '{}'::json, ${quote(USER_ID)}, now(), now())
     ON CONFLICT (id) DO NOTHING`,
  );
  await AppDataSource.query(
    `INSERT INTO submissions (id, "questId", "userId", proof, status, "createdAt", "updatedAt", "deletedAt")
     SELECT gen_random_uuid(),
            ${quote(QUEST_ID)},
            ${quote(USER_ID)},
            '{"fileName":"bench"}'::json,
            'PENDING',
            now() - (i * interval '1 second'),
            now() - (i * interval '1 second'),
            NULL
     FROM generate_series(1, ${TOTAL_ROWS}) AS i`,
  );
  console.log('Seeding complete.\n');
}

function offsetSql(offset: number): string {
  return `SELECT id, "userId", "createdAt" FROM submissions
          WHERE "userId" = ${quote(USER_ID)}
          ORDER BY "createdAt" DESC, id DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
}

function keysetSql(cursor: { createdAt: string; id: string }): string {
  return `SELECT id, "userId", "createdAt" FROM submissions
          WHERE "userId" = ${quote(USER_ID)}
            AND ("createdAt", id) < (${quote(cursor.createdAt)}, ${quote(cursor.id)})
          ORDER BY "createdAt" DESC, id DESC
          LIMIT ${PAGE_SIZE}`;
}

async function fetchCursorAt(
  offset: number,
): Promise<{ createdAt: string; id: string }> {
  const rows = await AppDataSource.query(
    `SELECT id, to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt"
     FROM submissions
     WHERE "userId" = ${quote(USER_ID)}
     ORDER BY "createdAt" DESC, id DESC
     LIMIT 1 OFFSET ${offset}`,
  );
  if (rows.length === 0) throw new Error(`No cursor row at offset ${offset}`);
  return rows[0];
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

async function main() {
  const args = process.argv.slice(2);
  const forceSeed = args.includes('--seed');
  const dropIndex = args.includes('--drop-index');

  await AppDataSource.initialize();
  console.log('Connected to database.\n');

  await seed(forceSeed);

  if (dropIndex) {
    console.log(
      `Dropping index ${SUBMISSIONS_INDEX} to simulate the "before" state…\n`,
    );
    await AppDataSource.query(`DROP INDEX IF EXISTS ${SUBMISSIONS_INDEX}`);
  } else {
    await AppDataSource.query(
      `CREATE INDEX IF NOT EXISTS ${SUBMISSIONS_INDEX} ON submissions ("userId", "createdAt" DESC, id DESC)`,
    );
    console.log(`Ensured composite index ${SUBMISSIONS_INDEX} is present.\n`);
  }

  const depths = [0, 10_000, 25_000, 50_000, 90_000];

  console.log(
    '──────────────────────────────────────────────────────────────────────',
  );
  console.log('OFFSET PAGINATION (before)');
  console.log(
    '──────────────────────────────────────────────────────────────────────',
  );
  const offsetResults: Record<number, RunStats> = {};
  for (const depth of depths) {
    const s = await bestOf(offsetSql(depth));
    offsetResults[depth] = s;
    console.log(
      `page depth ${pad(String(depth), 7)} → ${pad(s.executionMs.toFixed(3) + ' ms', 12)} planning ${s.planningMs.toFixed(3)} ms · ${s.buffers}`,
    );
  }

  console.log(
    '\n──────────────────────────────────────────────────────────────────────',
  );
  console.log('KEYSET PAGINATION (after)');
  console.log(
    '──────────────────────────────────────────────────────────────────────',
  );
  const keysetResults: Record<number, RunStats> = {};
  for (const depth of depths) {
    const cursor = await fetchCursorAt(depth);
    const s = await bestOf(keysetSql(cursor));
    keysetResults[depth] = s;
    console.log(
      `page depth ${pad(String(depth), 7)} → ${pad(s.executionMs.toFixed(3) + ' ms', 12)} planning ${s.planningMs.toFixed(3)} ms · ${s.buffers}`,
    );
  }

  console.log(
    '\n──────────────────────────────────────────────────────────────────────',
  );
  console.log('SUMMARY');
  console.log(
    '──────────────────────────────────────────────────────────────────────',
  );
  console.log('depth     offset (ms)   keyset (ms)   speedup');
  for (const depth of depths) {
    const o = offsetResults[depth].executionMs;
    const k = keysetResults[depth].executionMs;
    const speedup = o / k;
    console.log(
      `${pad(String(depth), 9)} ${pad(o.toFixed(3), 13)} ${pad(k.toFixed(3), 12)} ${speedup.toFixed(1)}×`,
    );
  }

  if (dropIndex) {
    await AppDataSource.query(
      `CREATE INDEX IF NOT EXISTS ${SUBMISSIONS_INDEX} ON submissions ("userId", "createdAt" DESC, id DESC)`,
    );
    console.log('\nComposite index recreated.');
  }

  await AppDataSource.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
