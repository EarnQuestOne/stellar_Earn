/**
 * Auth API – Stellar wallet-based challenge/sign-in flow with JWT tokens.
 *
 * Tokens are stored as httpOnly cookies set by the backend. The frontend
 * never reads or writes token values directly.
 *
 * Endpoints (all under /api/v1/auth):
 *  POST /challenge      – generate a one-time signing challenge
 *  POST /login          – verify signature, receive JWT pair as httpOnly cookies
 *  POST /refresh        – exchange refresh cookie for new pair
 *  GET  /profile        – get current authenticated user
 *  POST /logout         – revoke current session and clear cookies
 *  POST /logout-all     – revoke all sessions and clear cookies
 */

import { get, post, type CancelToken } from './client';
import type {
  ChallengeRequest,
  ChallengeResponse,
  LoginRequest,
  AuthUserProfile,
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
  stellarAddress: string
): Promise<ChallengeResponse> {
  const payload: ChallengeRequest = { stellarAddress };
  return post<ChallengeResponse>('/auth/challenge', payload);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Verify the wallet signature and exchange it for a JWT pair.
 * The backend sets httpOnly cookies (auth_token, refresh_token) via
 * Set-Cookie headers. The response body contains user info only.
 */
export async function login(payload: LoginRequest): Promise<{
  success: boolean;
  user: { id?: string; stellarAddress: string; role: string };
}> {
  return post('/auth/login', payload);
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Manually trigger a token refresh. The refresh token is carried via
 * httpOnly cookie automatically. Under normal circumstances the Axios
 * response interceptor handles this automatically; call this directly
 * only when you need explicit control.
 */
export async function refreshTokens(): Promise<void> {
  await post('/auth/refresh', {});
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Fetch the currently authenticated user's profile.
 * The access token is carried via httpOnly cookie automatically.
 */
export async function getAuthProfile(
  cancelToken?: CancelToken
): Promise<AuthUserProfile> {
  return get<AuthUserProfile>('/auth/profile', {
    signal: cancelToken?.signal,
  });
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Revoke the current session and clear auth cookies (set by the backend).
 */
export async function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/logout');
}

/**
 * Revoke all active sessions for the current user and clear auth cookies.
 */
export async function logoutAll(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/logout-all');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the user is authenticated by attempting to fetch the profile.
 * Returns the user profile if authenticated, null otherwise.
 * Note: this makes a network request and should be used sparingly.
 */
export async function checkAuthStatus(): Promise<AuthUserProfile | null> {
  try {
    return await getAuthProfile();
  } catch {
    return null;
  }
}
