/**
 * Auth API – Stellar wallet-based challenge/sign-in flow with JWT tokens.
 *
 * Endpoints (all under /api/v1/auth):
 *  POST /challenge      – generate a one-time signing challenge
 *  POST /login          – verify signature and receive JWT pair
 *  POST /refresh        – exchange refresh token for new pair
 *  GET  /profile        – get current authenticated user
 *  POST /logout         – revoke current session
 *  POST /logout-all     – revoke all sessions
 */

import { get, post, withRetry, createCancelToken, type CancelToken } from './client';
import { tokenManager } from './client';
import type {
  ChallengeRequest,
  ChallengeResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  AuthUserProfile,
  AuthTokens,
} from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// Challenge
// ---------------------------------------------------------------------------

/**
 * Request a one-time signing challenge for the given Stellar address.
 * The returned `challenge` string must be signed with the wallet private key
 * and then passed to `login()`.
 */
export async function generateChallenge(
  stellarAddress: string,
): Promise<ChallengeResponse> {
  const payload: ChallengeRequest = { stellarAddress };
  return post<ChallengeResponse>('/auth/challenge', payload);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Verify the wallet signature and exchange it for a JWT access + refresh token pair.
 * Tokens are automatically persisted via `tokenManager`.
 */
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const tokens = await post<LoginResponse>('/auth/login', payload);
  tokenManager.setTokens(tokens);
  return tokens;
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Manually exchange a refresh token for a new JWT pair.
 * Under normal circumstances the Axios response interceptor handles this
 * automatically; call this directly only when you need explicit control.
 */
export async function refreshTokens(
  refreshToken?: string,
): Promise<RefreshResponse> {
  const token = refreshToken ?? tokenManager.getRefreshToken();
  if (!token) {
    throw new Error('No refresh token available. Please log in again.');
  }
  const payload: RefreshRequest = { refreshToken: token };
  const tokens = await post<RefreshResponse>('/auth/refresh', payload);
  tokenManager.setTokens(tokens);
  return tokens;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Fetch the currently authenticated user's profile (requires access token).
 */
export async function getAuthProfile(
  cancelToken?: CancelToken,
): Promise<AuthUserProfile> {
  return get<AuthUserProfile>('/auth/profile', {
    signal: cancelToken?.signal,
  });
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Revoke the current session token and clear local storage.
 */
export async function logout(): Promise<{ message: string }> {
  try {
    const result = await post<{ message: string }>('/auth/logout');
    return result;
  } finally {
    tokenManager.clearTokens();
  }
}

/**
 * Revoke all active sessions for the current user and clear local storage.
 */
export async function logoutAll(): Promise<{ message: string }> {
  try {
    const result = await post<{ message: string }>('/auth/logout-all');
    return result;
  } finally {
    tokenManager.clearTokens();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when an access token is present in storage. */
export function isAuthenticated(): boolean {
  return tokenManager.getAccessToken() !== null;
}

/** Returns the stored tokens (or null if not logged in). */
export function getStoredTokens(): AuthTokens | null {
  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
