// =============================================================================
// TypeScript types for all EarnQuest contract events
// =============================================================================
// Mirrors the event data structures from contracts/earn-quest/src/events.rs
// =============================================================================

// ── Enum types ────────────────────────────────────────────────────────────────

export enum QuestStatus {
  Active = 'Active',
  Paused = 'Paused',
  Completed = 'Completed',
  Expired = 'Expired',
  Cancelled = 'Cancelled',
}

export enum SubmissionStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Paid = 'Paid',
}

export enum DisputeStatus {
  Pending = 'Pending',
  UnderReview = 'UnderReview',
  Resolved = 'Resolved',
  Withdrawn = 'Withdrawn',
  Appealed = 'Appealed',
}

export enum BadgeType {
  Rookie = 'Rookie',
  Explorer = 'Explorer',
  Veteran = 'Veteran',
  Master = 'Master',
  Legend = 'Legend',
}

// ── Entity types ──────────────────────────────────────────────────────────────

export interface QuestEntity {
  id: string;
  creator: string;
  reward_asset: string;
  reward_amount: string;   // BigInt as string
  verifier: string;
  deadline: string;        // u64 as string
  status: QuestStatus;
  total_claims: number;
  created_at: string;
  created_in_ledger: number;
}

export interface QuestMetadataEntity {
  id: string;
  quest_id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  tags: string;           // JSON stringified array
  requirements: string;   // JSON stringified array
}

export interface SubmissionEntity {
  id: string;             // "questId:submitter"
  quest_id: string;
  submitter: string;
  proof_hash: string;
  status: SubmissionStatus;
  timestamp: string;
  commitment_hash: string | null;
  revealed: boolean;
}

export interface EscrowEntity {
  id: string;
  quest_id: string;
  depositor: string;
  token: string;
  total_deposited: string;
  total_paid_out: string;
  total_refunded: string;
  is_active: boolean;
  deposit_count: number;
  created_at: string;
}

export interface DisputeEntity {
  id: string;
  quest_id: string;
  initiator: string;
  arbitrator: string;
  status: DisputeStatus;
  filed_at: string;
}

export interface UserStatsEntity {
  id: string;
  xp: string;
  level: number;
  quests_completed: number;
  badges: string;          // JSON stringified array
  total_submissions: number;
  total_payouts: number;
  total_payout_amount: string;
}

// ── Parsed event data types (from Soroban event topics + data) ────────────────

export interface QuestRegisteredData {
  questId: string;
  creator: string;
  rewardAsset: string;
  rewardAmount: string;
  verifier: string;
  deadline: string;
}

export interface ProofSubmittedData {
  questId: string;
  submitter: string;
  proofHash: string;
}

export interface SubmissionApprovedData {
  questId: string;
  submitter: string;
  verifier: string;
}

export interface RewardClaimedData {
  questId: string;
  submitter: string;
  rewardAsset: string;
  rewardAmount: string;
}

export interface XpAwardedData {
  user: string;
  xpAmount: string;
  totalXp: string;
  level: number;
}

export interface LevelUpData {
  user: string;
  newLevel: number;
}

export interface BadgeGrantedData {
  user: string;
  badge: BadgeType;
}

export interface EmergencyPausedData {
  by: string;
}

export interface EmergencyUnpausedData {
  by: string;
}

export interface EmergencyWithdrawnData {
  by: string;
  asset: string;
  to: string;
  amount: string;
}

export interface UnpauseApprovedData {
  admin: string;
}

export interface TimelockScheduledData {
  scheduledTime: string;
}

export interface QuestPausedData {
  questId: string;
  by: string;
}

export interface QuestResumedData {
  questId: string;
  by: string;
}

export interface QuestCancelledData {
  questId: string;
  creator: string;
  refunded: string;
}

export interface DisputeOpenedData {
  questId: string;
  initiator: string;
  arbitrator: string;
}

export interface DisputeResolvedData {
  questId: string;
  initiator: string;
  arbitrator: string;
}

export interface DisputeWithdrawnData {
  questId: string;
  initiator: string;
}

export interface DisputeAppealedData {
  questId: string;
  initiator: string;
  arbitrator: string;
}

export interface EscrowDepositedData {
  questId: string;
  depositor: string;
  token: string;
  amount: string;
  totalBalance: string;
}

export interface EscrowPayoutData {
  questId: string;
  recipient: string;
  token: string;
  amount: string;
  remaining: string;
}

export interface EscrowRefundedData {
  questId: string;
  recipient: string;
  token: string;
  amount: string;
}

export interface CommitmentSubmittedData {
  questId: string;
  submitter: string;
  hash: string;
}

export interface SubmissionRevealedData {
  questId: string;
  submitter: string;
  proofHash: string;
}

// ── Generic event wrapper ─────────────────────────────────────────────────────

export type EventData =
  | QuestRegisteredData
  | ProofSubmittedData
  | SubmissionApprovedData
  | RewardClaimedData
  | XpAwardedData
  | LevelUpData
  | BadgeGrantedData
  | EmergencyPausedData
  | EmergencyUnpausedData
  | EmergencyWithdrawnData
  | UnpauseApprovedData
  | TimelockScheduledData
  | QuestPausedData
  | QuestResumedData
  | QuestCancelledData
  | DisputeOpenedData
  | DisputeResolvedData
  | DisputeWithdrawnData
  | DisputeAppealedData
  | EscrowDepositedData
  | EscrowPayoutData
  | EscrowRefundedData
  | CommitmentSubmittedData
  | SubmissionRevealedData;

export interface IndexedEvent {
  id: string;             // unique: "txHash:eventIndex"
  eventType: string;
  contractId: string;
  topics: string[];       // raw topic strings
  data: string;           // raw data string
  parsedData: EventData;
  ledger: number;
  ledgerTimestamp: string;
  txHash: string;
}
