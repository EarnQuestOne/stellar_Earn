// =============================================================================
// SQLite storage layer for the EarnQuest subgraph
// =============================================================================
// Stores indexed events and entity state for efficient querying via GraphQL.
// =============================================================================

import Database from 'better-sqlite3';
import { config } from '../config';
import {
  QuestEntity,
  QuestMetadataEntity,
  SubmissionEntity,
  EscrowEntity,
  DisputeEntity,
  UserStatsEntity,
  QuestStatus,
  SubmissionStatus,
  DisputeStatus,
} from '../config/types';

let db: Database.Database;

// ── Initialization ────────────────────────────────────────────────────────────

export function initDatabase(dbPath?: string): Database.Database {
  db = new Database(dbPath || config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  createTables();
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function createTables(): void {
  db.exec(`
    -- Cursor tracking (which ledger we've indexed up to)
    CREATE TABLE IF NOT EXISTS indexing_cursor (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      ledger      INTEGER NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Quests
    CREATE TABLE IF NOT EXISTS quests (
      id                TEXT PRIMARY KEY,
      creator           TEXT NOT NULL,
      reward_asset      TEXT NOT NULL,
      reward_amount     TEXT NOT NULL,
      verifier          TEXT NOT NULL,
      deadline          TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'Active',
      total_claims      INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      created_in_ledger INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_quests_creator ON quests(creator);
    CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
    CREATE INDEX IF NOT EXISTS idx_quests_reward_asset ON quests(reward_asset);

    -- Quest Metadata
    CREATE TABLE IF NOT EXISTS quest_metadata (
      id            TEXT PRIMARY KEY,
      quest_id      TEXT NOT NULL REFERENCES quests(id),
      title         TEXT,
      description   TEXT,
      category      TEXT,
      tags          TEXT NOT NULL DEFAULT '[]',
      requirements  TEXT NOT NULL DEFAULT '[]'
    );

    -- Submissions
    CREATE TABLE IF NOT EXISTS submissions (
      id              TEXT PRIMARY KEY,
      quest_id        TEXT NOT NULL REFERENCES quests(id),
      submitter       TEXT NOT NULL,
      proof_hash      TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'Pending',
      timestamp       TEXT NOT NULL,
      commitment_hash TEXT,
      revealed        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_quest ON submissions(quest_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_submitter ON submissions(submitter);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

    -- Escrows
    CREATE TABLE IF NOT EXISTS escrows (
      id              TEXT PRIMARY KEY,
      quest_id        TEXT NOT NULL REFERENCES quests(id),
      depositor       TEXT NOT NULL,
      token           TEXT NOT NULL,
      total_deposited TEXT NOT NULL DEFAULT '0',
      total_paid_out  TEXT NOT NULL DEFAULT '0',
      total_refunded  TEXT NOT NULL DEFAULT '0',
      is_active       INTEGER NOT NULL DEFAULT 1,
      deposit_count   INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_escrows_quest ON escrows(quest_id);

    -- Disputes
    CREATE TABLE IF NOT EXISTS disputes (
      id            TEXT PRIMARY KEY,
      quest_id      TEXT NOT NULL REFERENCES quests(id),
      initiator     TEXT NOT NULL,
      arbitrator    TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'Pending',
      filed_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_disputes_quest ON disputes(quest_id);

    -- User Stats
    CREATE TABLE IF NOT EXISTS user_stats (
      id                  TEXT PRIMARY KEY,
      xp                  TEXT NOT NULL DEFAULT '0',
      level               INTEGER NOT NULL DEFAULT 1,
      quests_completed    INTEGER NOT NULL DEFAULT 0,
      badges              TEXT NOT NULL DEFAULT '[]',
      total_submissions   INTEGER NOT NULL DEFAULT 0,
      total_payouts       INTEGER NOT NULL DEFAULT 0,
      total_payout_amount TEXT NOT NULL DEFAULT '0'
    );

    -- Immutable Event Log
    CREATE TABLE IF NOT EXISTS events (
      id              TEXT PRIMARY KEY,
      event_type      TEXT NOT NULL,
      contract_id     TEXT NOT NULL,
      topics          TEXT NOT NULL,
      data            TEXT NOT NULL DEFAULT '{}',
      ledger          INTEGER NOT NULL,
      ledger_timestamp TEXT NOT NULL,
      tx_hash         TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_ledger ON events(ledger);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(ledger_timestamp);
  `);

  // Initialize cursor if not present
  const row = db.prepare('SELECT ledger FROM indexing_cursor WHERE id = 1').get() as { ledger: number } | undefined;
  if (!row) {
    db.prepare('INSERT INTO indexing_cursor (id, ledger) VALUES (1, 0)').run();
  }
}

// ── Cursor operations ─────────────────────────────────────────────────────────

export function getCursor(): number {
  const row = db.prepare('SELECT ledger FROM indexing_cursor WHERE id = 1').get() as { ledger: number };
  return row.ledger;
}

export function setCursor(ledger: number): void {
  db.prepare('UPDATE indexing_cursor SET ledger = ?, updated_at = datetime("now") WHERE id = 1').run(ledger);
}

// ── Quest operations ──────────────────────────────────────────────────────────

const upsertQuest = db?.prepare(`
  INSERT INTO quests (id, creator, reward_asset, reward_amount, verifier, deadline, status, total_claims, created_at, created_in_ledger)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    status = excluded.status,
    total_claims = excluded.total_claims
`);

export function saveQuest(q: QuestEntity): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO quests (id, creator, reward_asset, reward_amount, verifier, deadline, status, total_claims, created_at, created_in_ledger)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      total_claims = excluded.total_claims
  `);
  stmt.run(q.id, q.creator, q.reward_asset, q.reward_amount, q.verifier, q.deadline, q.status, q.total_claims, q.created_at, q.created_in_ledger);
}

export function getQuest(id: string): QuestEntity | undefined {
  return getDatabase().prepare('SELECT * FROM quests WHERE id = ?').get(id) as QuestEntity | undefined;
}

export function getQuestsByCreator(creator: string, limit: number, offset: number): QuestEntity[] {
  return getDatabase().prepare('SELECT * FROM quests WHERE creator = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(creator, limit, offset) as QuestEntity[];
}

export function getQuestsByStatus(status: string, limit: number, offset: number): QuestEntity[] {
  return getDatabase().prepare('SELECT * FROM quests WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(status, limit, offset) as QuestEntity[];
}

export function getQuestsByRewardAsset(asset: string, limit: number, offset: number): QuestEntity[] {
  return getDatabase().prepare('SELECT * FROM quests WHERE reward_asset = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(asset, limit, offset) as QuestEntity[];
}

export function updateQuestStatus(id: string, status: QuestStatus): void {
  getDatabase().prepare('UPDATE quests SET status = ? WHERE id = ?').run(status, id);
}

export function incrementQuestClaims(id: string): void {
  getDatabase().prepare('UPDATE quests SET total_claims = total_claims + 1 WHERE id = ?').run(id);
}

// ── Submission operations ─────────────────────────────────────────────────────

export function saveSubmission(s: SubmissionEntity): void {
  getDatabase().prepare(`
    INSERT INTO submissions (id, quest_id, submitter, proof_hash, status, timestamp, commitment_hash, revealed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      proof_hash = excluded.proof_hash,
      commitment_hash = COALESCE(excluded.commitment_hash, submissions.commitment_hash),
      revealed = CASE WHEN excluded.revealed = 1 THEN 1 ELSE submissions.revealed END
  `).run(s.id, s.quest_id, s.submitter, s.proof_hash, s.status, s.timestamp, s.commitment_hash, s.revealed ? 1 : 0);
}

export function getSubmission(id: string): SubmissionEntity | undefined {
  const row = getDatabase().prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return { ...row, revealed: row.revealed === 1 };
}

export function getSubmissionsByQuest(questId: string, limit: number, offset: number): SubmissionEntity[] {
  return getDatabase().prepare('SELECT * FROM submissions WHERE quest_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(questId, limit, offset) as SubmissionEntity[];
}

export function getSubmissionsByUser(submitter: string, limit: number, offset: number): SubmissionEntity[] {
  return getDatabase().prepare('SELECT * FROM submissions WHERE submitter = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(submitter, limit, offset) as SubmissionEntity[];
}

export function updateSubmissionStatus(id: string, status: SubmissionStatus): void {
  getDatabase().prepare('UPDATE submissions SET status = ? WHERE id = ?').run(status, id);
}

// ── Escrow operations ─────────────────────────────────────────────────────────

export function saveEscrow(e: EscrowEntity): void {
  getDatabase().prepare(`
    INSERT INTO escrows (id, quest_id, depositor, token, total_deposited, total_paid_out, total_refunded, is_active, deposit_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      total_deposited = excluded.total_deposited,
      total_paid_out = excluded.total_paid_out,
      total_refunded = excluded.total_refunded,
      is_active = excluded.is_active,
      deposit_count = excluded.deposit_count
  `).run(e.id, e.quest_id, e.depositor, e.token, e.total_deposited, e.total_paid_out, e.total_refunded, e.is_active ? 1 : 0, e.deposit_count, e.created_at);
}

export function getEscrow(id: string): EscrowEntity | undefined {
  const row = getDatabase().prepare('SELECT * FROM escrows WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return { ...row, is_active: row.is_active === 1 };
}

export function getEscrowByQuest(questId: string): EscrowEntity | undefined {
  const row = getDatabase().prepare('SELECT * FROM escrows WHERE quest_id = ?').get(questId) as any;
  if (!row) return undefined;
  return { ...row, is_active: row.is_active === 1 };
}

// ── Dispute operations ────────────────────────────────────────────────────────

export function saveDispute(d: DisputeEntity): void {
  getDatabase().prepare(`
    INSERT INTO disputes (id, quest_id, initiator, arbitrator, status, filed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status
  `).run(d.id, d.quest_id, d.initiator, d.arbitrator, d.status, d.filed_at);
}

export function getDisputesByQuest(questId: string, limit: number, offset: number): DisputeEntity[] {
  return getDatabase().prepare('SELECT * FROM disputes WHERE quest_id = ? ORDER BY filed_at DESC LIMIT ? OFFSET ?').all(questId, limit, offset) as DisputeEntity[];
}

// ── User stats operations ─────────────────────────────────────────────────────

export function saveUserStats(u: UserStatsEntity): void {
  getDatabase().prepare(`
    INSERT INTO user_stats (id, xp, level, quests_completed, badges, total_submissions, total_payouts, total_payout_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      xp = excluded.xp,
      level = excluded.level,
      quests_completed = excluded.quests_completed,
      badges = excluded.badges,
      total_submissions = excluded.total_submissions,
      total_payouts = excluded.total_payouts,
      total_payout_amount = excluded.total_payout_amount
  `).run(u.id, u.xp, u.level, u.quests_completed, u.badges, u.total_submissions, u.total_payouts, u.total_payout_amount);
}

export function getUserStats(id: string): UserStatsEntity | undefined {
  return getDatabase().prepare('SELECT * FROM user_stats WHERE id = ?').get(id) as UserStatsEntity | undefined;
}

export function ensureUserStats(userId: string): UserStatsEntity {
  let stats = getUserStats(userId);
  if (!stats) {
    const empty: UserStatsEntity = {
      id: userId,
      xp: '0',
      level: 1,
      quests_completed: 0,
      badges: '[]',
      total_submissions: 0,
      total_payouts: 0,
      total_payout_amount: '0',
    };
    saveUserStats(empty);
    stats = empty;
  }
  return stats;
}

// ── Event log operations ──────────────────────────────────────────────────────

export function saveEvent(event: {
  id: string;
  eventType: string;
  contractId: string;
  topics: string;
  data: string;
  ledger: number;
  ledgerTimestamp: string;
  txHash: string;
}): void {
  getDatabase().prepare(`
    INSERT OR IGNORE INTO events (id, event_type, contract_id, topics, data, ledger, ledger_timestamp, tx_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(event.id, event.eventType, event.contractId, event.topics, event.data, event.ledger, event.ledgerTimestamp, event.txHash);
}

export function getEvents(eventType?: string, limit: number = 50, offset: number = 0): any[] {
  if (eventType) {
    return getDatabase().prepare('SELECT * FROM events WHERE event_type = ? ORDER BY ledger DESC LIMIT ? OFFSET ?').all(eventType, limit, offset);
  }
  return getDatabase().prepare('SELECT * FROM events ORDER BY ledger DESC LIMIT ? OFFSET ?').all(limit, offset);
}

export function getEventsByTimestampRange(from: string, to: string, limit: number, offset: number): any[] {
  return getDatabase().prepare('SELECT * FROM events WHERE ledger_timestamp >= ? AND ledger_timestamp <= ? ORDER BY ledger DESC LIMIT ? OFFSET ?').all(from, to, limit, offset);
}

// ── Platform aggregates ───────────────────────────────────────────────────────

export function getPlatformAggregates(): {
  totalQuests: number;
  totalSubmissions: number;
  totalRewardsClaimed: number;
  totalRewardsDistributed: string;
  totalActiveUsers: number;
} {
  const d = getDatabase();
  const totalQuests = (d.prepare('SELECT COUNT(*) as c FROM quests').get() as any).c;
  const totalSubmissions = (d.prepare('SELECT COUNT(*) as c FROM submissions').get() as any).c;
  const totalRewardsClaimed = (d.prepare("SELECT COUNT(*) as c FROM submissions WHERE status = 'Paid'").get() as any).c;
  const totalActiveUsers = (d.prepare('SELECT COUNT(*) as c FROM user_stats').get() as any).c;

  let totalRewardsDistributed = BigInt(0);
  const rows = d.prepare("SELECT reward_amount FROM quests WHERE status = 'Completed' OR status = 'Active'").all() as { reward_amount: string }[];
  for (const r of rows) {
    totalRewardsDistributed += BigInt(r.reward_amount);
  }

  return {
    totalQuests,
    totalSubmissions,
    totalRewardsClaimed,
    totalRewardsDistributed: totalRewardsDistributed.toString(),
    totalActiveUsers,
  };
}
