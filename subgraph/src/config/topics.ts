// =============================================================================
// Event topic constants — mirrors contracts/earn-quest/src/events.rs
// =============================================================================

/** Soroban symbol_short! values used as the first topic in every event. */
export const EVENT_TOPICS = {
  QUEST_REGISTERED: 'quest_reg',
  PROOF_SUBMITTED: 'proof_sub',
  SUBMISSION_APPROVED: 'sub_appr',
  REWARD_CLAIMED: 'claimed',
  XP_AWARDED: 'xp_award',
  LEVEL_UP: 'level_up',
  BADGE_GRANTED: 'badge_grt',
  EMERGENCY_PAUSED: 'epause',
  EMERGENCY_UNPAUSED: 'eunpause',
  EMERGENCY_WITHDRAW: 'ewdraw',
  UNPAUSE_APPROVED: 'uappr',
  TIMELOCK_SCHEDULED: 'tl_sched',
  QUEST_PAUSED: 'q_pause',
  QUEST_RESUMED: 'q_resume',
  QUEST_CANCELLED: 'q_cancel',
  DISPUTE_OPENED: 'disp_open',
  DISPUTE_RESOLVED: 'disp_res',
  DISPUTE_WITHDRAWN: 'disp_wd',
  DISPUTE_APPEALED: 'disp_appl',
  ESCROW_DEPOSITED: 'esc_dep',
  ESCROW_PAYOUT: 'esc_pay',
  ESCROW_REFUNDED: 'esc_ref',
  COMMITMENT_SUBMITTED: 'com_sub',
  SUBMISSION_REVEALED: 'sub_rev',
} as const;

export type EventTopicName = keyof typeof EVENT_TOPICS;
export type EventTopicValue = (typeof EVENT_TOPICS)[EventTopicName];

/** Reverse map: value → name */
export const TOPIC_TO_NAME: Record<string, EventTopicName> = Object.fromEntries(
  Object.entries(EVENT_TOPICS).map(([k, v]) => [v, k as EventTopicName]),
);
