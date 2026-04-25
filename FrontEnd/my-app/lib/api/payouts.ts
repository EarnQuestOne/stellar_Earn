/**
 * Payouts API – claim rewards and inspect payout history / stats.
 *
 * Endpoints (all under /api/v1/payouts):
 *  POST /claim            – claim a pending payout
 *  GET  /history          – paginated payout history for the current user
 *  GET  /stats            – payout statistics for the current user
 *  GET  /:id              – single payout by ID
 *
 * Admin-only endpoints:
 *  POST /admin/create     – create a payout manually
 *  GET  /admin/all        – all payouts (global)
 *  GET  /admin/stats      – global statistics
 *  POST /admin/:id/retry  – retry a failed payout
 *  GET  /admin/:id        – any payout by ID
 */

import {
  get,
  post,
  withRetry,
  createCancelToken,
  type CancelToken,
} from './client';
import type {
  PayoutResponse,
  PayoutHistoryResponse,
  PayoutStatsResponse,
  ClaimPayoutRequest,
  PayoutQueryParams,
} from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// Claim payout
// ---------------------------------------------------------------------------

/**
 * Claim a pending payout for an approved submission.
 * @param submissionId  UUID of the approved submission
 * @param stellarAddress  Recipient Stellar public key
 */
export async function claimPayout(
  submissionId: string,
  stellarAddress: string,
): Promise<PayoutResponse> {
  const payload: ClaimPayoutRequest = { submissionId, stellarAddress };
  return post<PayoutResponse>('/payouts/claim', payload);
}

// ---------------------------------------------------------------------------
// Payout history (current user)
// ---------------------------------------------------------------------------

/**
 * Get paginated payout history for the currently authenticated user.
 */
export async function getPayoutHistory(
  query?: PayoutQueryParams,
  cancelToken?: CancelToken,
): Promise<PayoutHistoryResponse> {
  const params: Record<string, string | number | undefined> = {};
  if (query?.status) params.status = query.status;
  if (query?.type) params.type = query.type;
  if (query?.page) params.page = query.page;
  if (query?.limit) params.limit = query.limit;

  return withRetry(() =>
    get<PayoutHistoryResponse>('/payouts/history', {
      params,
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Payout statistics (current user)
// ---------------------------------------------------------------------------

export async function getPayoutStats(
  cancelToken?: CancelToken,
): Promise<PayoutStatsResponse> {
  return withRetry(() =>
    get<PayoutStatsResponse>('/payouts/stats', {
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Single payout by ID
// ---------------------------------------------------------------------------

export async function getPayoutById(
  id: string,
  cancelToken?: CancelToken,
): Promise<PayoutResponse> {
  return withRetry(() =>
    get<PayoutResponse>(`/payouts/${id}`, {
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------

export async function adminGetAllPayouts(
  query?: PayoutQueryParams,
  cancelToken?: CancelToken,
): Promise<PayoutHistoryResponse> {
  const params: Record<string, string | number | undefined> = {};
  if (query?.stellarAddress) params.stellarAddress = query.stellarAddress;
  if (query?.status) params.status = query.status;
  if (query?.type) params.type = query.type;
  if (query?.page) params.page = query.page;
  if (query?.limit) params.limit = query.limit;

  return withRetry(() =>
    get<PayoutHistoryResponse>('/payouts/admin/all', {
      params,
      signal: cancelToken?.signal,
    }),
  );
}

export async function adminGetPayoutStats(
  cancelToken?: CancelToken,
): Promise<PayoutStatsResponse> {
  return withRetry(() =>
    get<PayoutStatsResponse>('/payouts/admin/stats', {
      signal: cancelToken?.signal,
    }),
  );
}

export async function adminRetryPayout(id: string): Promise<PayoutResponse> {
  return post<PayoutResponse>(`/payouts/admin/${id}/retry`);
}

export async function adminGetPayoutById(
  id: string,
  cancelToken?: CancelToken,
): Promise<PayoutResponse> {
  return withRetry(() =>
    get<PayoutResponse>(`/payouts/admin/${id}`, {
      signal: cancelToken?.signal,
    }),
  );
}
