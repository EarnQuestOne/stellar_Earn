/**
 * Analytics event names and types.
 * Use these constants to ensure consistency and avoid PII in event names.
 */

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  QUEST_VIEW: 'quest_view',
  QUEST_START: 'quest_start',
  QUEST_SUBMIT: 'quest_submit',
  QUEST_ABANDON: 'quest_abandon',
  REWARD_CLAIM_START: 'reward_claim_start',
  REWARD_CLAIM_SUCCESS: 'reward_claim_success',
  REWARD_CLAIM_FAIL: 'reward_claim_fail',
  WALLET_CONNECT: 'wallet_connect',
  WALLET_DISCONNECT: 'wallet_disconnect',
  CONVERSION_QUEST_COMPLETE: 'conversion_quest_complete',
  CONVERSION_FIRST_CLAIM: 'conversion_first_claim',
  CONVERSION_SIGNUP: 'conversion_signup',
  ADMIN_VIEW_ANALYTICS: 'admin_view_analytics',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEventPayload {
  [key: string]: string | number | boolean | undefined | null;
}

export interface TrackEventInput {
  name: AnalyticsEventName | string;
  payload?: AnalyticsEventPayload;
}
