// =============================================================================
// GraphQL Resolvers — maps queries to the SQLite storage layer
// =============================================================================

import {
  getQuest,
  getQuestsByCreator,
  getQuestsByStatus,
  getQuestsByRewardAsset,
  getSubmission,
  getSubmissionsByQuest,
  getSubmissionsByUser,
  getEscrow,
  getEscrowByQuest,
  getDisputesByQuest,
  getUserStats,
  ensureUserStats,
  getEvents,
  getEventsByTimestampRange,
  getPlatformAggregates,
  getDatabase,
} from '../storage/database';

import { QuestStatus, SubmissionStatus } from '../config/types';

export const resolvers = {
  Query: {
    // ── Quest queries ─────────────────────────────────────────────────────
    quest: (_: any, { id }: { id: string }) => {
      return questToGraphQL(getQuest(id));
    },

    quests: (
      _: any,
      {
        filter,
        first = 10,
        offset = 0,
        orderBy = 'created_at',
        orderDirection = 'desc',
      }: {
        filter?: { creator?: string; status?: string; rewardAsset?: string };
        first?: number;
        offset?: number;
        orderBy?: string;
        orderDirection?: string;
      },
    ) => {
      if (filter?.creator) return getQuestsByCreator(filter.creator, first, offset).map(questToGraphQL);
      if (filter?.status) return getQuestsByStatus(filter.status, first, offset).map(questToGraphQL);
      if (filter?.rewardAsset) return getQuestsByRewardAsset(filter.rewardAsset, first, offset).map(questToGraphQL);
      return [];
    },

    questsByCreator: (_: any, { creator, first = 10, offset = 0 }: { creator: string; first?: number; offset?: number }) => {
      return getQuestsByCreator(creator, first, offset).map(questToGraphQL);
    },

    questsByStatus: (_: any, { status, first = 10, offset = 0 }: { status: string; first?: number; offset?: number }) => {
      return getQuestsByStatus(status, first, offset).map(questToGraphQL);
    },

    questsByRewardAsset: (_: any, { rewardAsset, first = 10, offset = 0 }: { rewardAsset: string; first?: number; offset?: number }) => {
      return getQuestsByRewardAsset(rewardAsset, first, offset).map(questToGraphQL);
    },

    // ── Submission queries ─────────────────────────────────────────────────
    submission: (_: any, { id }: { id: string }) => {
      return submissionToGraphQL(getSubmission(id));
    },

    submissions: (
      _: any,
      {
        filter,
        first = 10,
        offset = 0,
      }: {
        filter?: { questId?: string; submitter?: string; status?: string };
        first?: number;
        offset?: number;
      },
    ) => {
      if (filter?.questId) return getSubmissionsByQuest(filter.questId, first, offset).map(submissionToGraphQL);
      if (filter?.submitter) return getSubmissionsByUser(filter.submitter, first, offset).map(submissionToGraphQL);
      return [];
    },

    submissionsByQuest: (_: any, { questId, first = 10, offset = 0 }: { questId: string; first?: number; offset?: number }) => {
      return getSubmissionsByQuest(questId, first, offset).map(submissionToGraphQL);
    },

    submissionsByUser: (_: any, { submitter, first = 10, offset = 0 }: { submitter: string; first?: number; offset?: number }) => {
      return getSubmissionsByUser(submitter, first, offset).map(submissionToGraphQL);
    },

    // ── User queries ───────────────────────────────────────────────────────
    userStats: (_: any, { id }: { id: string }) => {
      return userStatsToGraphQL(getUserStats(id));
    },

    userActivity: (_: any, { address }: { address: string }) => {
      const stats = ensureUserStats(address);
      return {
        totalSubmissions: stats.total_submissions,
        totalApprovals: 0, // would need a more complex query
        totalClaims: stats.total_payouts,
        totalEarned: stats.total_payout_amount,
        xp: stats.xp,
        level: stats.level,
      };
    },

    // ── Escrow queries ─────────────────────────────────────────────────────
    escrow: (_: any, { id }: { id: string }) => {
      return escrowToGraphQL(getEscrow(id));
    },

    escrowByQuest: (_: any, { questId }: { questId: string }) => {
      return escrowToGraphQL(getEscrowByQuest(questId));
    },

    // ── Dispute queries ────────────────────────────────────────────────────
    disputesByQuest: (_: any, { questId, first = 10, offset = 0 }: { questId: string; first?: number; offset?: number }) => {
      return getDisputesByQuest(questId, first, offset).map(disputeToGraphQL);
    },

    // ── Event queries ──────────────────────────────────────────────────────
    events: (
      _: any,
      {
        filter,
        first = 10,
        offset = 0,
      }: {
        filter?: { eventType?: string; fromTimestamp?: string; toTimestamp?: string };
        first?: number;
        offset?: number;
      },
    ) => {
      if (filter?.fromTimestamp && filter?.toTimestamp) {
        return getEventsByTimestampRange(filter.fromTimestamp, filter.toTimestamp, first, offset);
      }
      return getEvents(filter?.eventType, first, offset);
    },

    // ── Platform stats ─────────────────────────────────────────────────────
    platformStats: () => {
      return getPlatformAggregates();
    },

    // ── Search ─────────────────────────────────────────────────────────────
    searchQuests: (_: any, { query, first = 10, offset = 0 }: { query: string; first?: number; offset?: number }) => {
      // Basic search — in production would use full-text search
      const db = getDatabase();
      const results = db.prepare(
        `SELECT * FROM quests WHERE id LIKE ? OR creator LIKE ? LIMIT ? OFFSET ?`
      ).all(`%${query}%`, `%${query}%`, first, offset);
      return results.map(questToGraphQL);
    },
  },
};

// =============================================================================
// Entity Transformers (DB row → GraphQL response shape)
// =============================================================================

function questToGraphQL(q: any): any {
  if (!q) return null;
  return {
    id: q.id,
    creator: q.creator,
    rewardAsset: q.reward_asset,
    rewardAmount: q.reward_amount,
    verifier: q.verifier,
    deadline: q.deadline,
    status: q.status,
    totalClaims: q.total_claims,
    createdAt: q.created_at,
    createdInLedger: q.created_in_ledger,
  };
}

function submissionToGraphQL(s: any): any {
  if (!s) return null;
  return {
    id: s.id,
    questId: s.quest_id,
    submitter: s.submitter,
    proofHash: s.proof_hash,
    status: s.status,
    timestamp: s.timestamp,
    commitmentHash: s.commitment_hash,
    revealed: s.revealed === 1 || s.revealed === true,
  };
}

function escrowToGraphQL(e: any): any {
  if (!e) return null;
  return {
    id: e.id,
    questId: e.quest_id,
    depositor: e.depositor,
    token: e.token,
    totalDeposited: e.total_deposited,
    totalPaidOut: e.total_paid_out,
    totalRefunded: e.total_refunded,
    isActive: e.is_active === 1 || e.is_active === true,
    depositCount: e.deposit_count,
    createdAt: e.created_at,
  };
}

function disputeToGraphQL(d: any): any {
  if (!d) return null;
  return {
    id: d.id,
    questId: d.quest_id,
    initiator: d.initiator,
    arbitrator: d.arbitrator,
    status: d.status,
    filedAt: d.filed_at,
  };
}

function userStatsToGraphQL(u: any): any {
  if (!u) return null;
  return {
    id: u.id,
    xp: u.xp,
    level: u.level,
    questsCompleted: u.quests_completed,
    badges: JSON.parse(u.badges || '[]'),
    totalSubmissions: u.total_submissions,
    totalPayouts: u.total_payouts,
    totalPayoutAmount: u.total_payout_amount,
  };
}
