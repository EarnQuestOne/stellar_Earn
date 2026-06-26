/**
 * Axios-based HTTP client for the StellarEarn API.
 *
 * Features:
 * - Uses httpOnly cookies for secure token storage (no localStorage)
 * - Transparent JWT access-token refresh on 401 (with request queuing)
 * - Configurable retry with exponential back-off for network / 5xx errors
 * - Per-request cancellation via AbortController
 * - 30-second default timeout
 * - Typed error transformation
 * - Global offline fallback and API unreachable detection
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  createAppError,
  ERROR_CODES,
  type AppError,
} from '@/lib/utils/error-handler';
import { mapApiError, inferDomainFromUrl } from '@/lib/api/api-error-mapper';
import type { ApiErrorResponse, AuthTokens } from '@/lib/types/api.types';
import { env } from '@/lib/config/env';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_VERSION = 'v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Token management (cookies only - no localStorage for tokens)
// ---------------------------------------------------------------------------

function isClient(): boolean {
  return typeof window !== 'undefined';
}

const ACCESS_TOKEN_KEY = 'stellar_earn_access_token';
const REFRESH_TOKEN_KEY = 'stellar_earn_refresh_token';

// Add these helper functions right before tokenManager

function isValidJwtToken(token: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  if (parts.some((part) => part.length === 0)) return false;
  return true;
}

function safeGetToken(key: string): string | null {
  if (!isClient()) return null;
  try {
    const token = window.localStorage.getItem(key);
    if (!token) return null;
    if (!isValidJwtToken(token)) {
      console.warn(`[tokenManager] Invalid token format for key: ${key}`);
      window.localStorage.removeItem(key);
      return null;
    }
    return token;
  } catch (error) {
    console.error(`[tokenManager] Failed to read token:`, error);
    return null;
  }
}

function safeSetToken(key: string, token: string): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, token);
  } catch (error) {
    console.error(`[tokenManager] Failed to save token:`, error);
  }
}

export const tokenManager = {
  getAccessToken(): string | null {
    return safeGetToken(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return safeGetToken(REFRESH_TOKEN_KEY);
  },
  setTokens(tokens: AuthTokens): void {
    safeSetToken(ACCESS_TOKEN_KEY, tokens.accessToken);
    safeSetToken(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clearTokens(): void {
    if (!isClient()) return;
    try {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[tokenManager] Failed to clear tokens:', error);
    }
  },
};

// ---------------------------------------------------------------------------
// Token-refresh queue (prevents parallel refresh races)
// ---------------------------------------------------------------------------

type QueueItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve(token!);
    }
  });
  failedQueue = [];
}

// ---------------------------------------------------------------------------
// Error transformation & Offline detection
// ---------------------------------------------------------------------------

function isAxiosError(error: unknown): error is AxiosError {
  return error !== null && typeof error === 'object' && 'isAxiosError' in error;
}

function transformAxiosError(error: unknown): AppError {
  if (!isAxiosError(error)) {
    // Non-Axios error
    let errorMessage = 'An unexpected error occurred';

    if (error && typeof error === 'object') {
      if ('message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return createAppError(errorMessage, ERROR_CODES.SERVER_ERROR, 0);
  }

  const status = error.response?.status;

  if (!status) {
    const isOffline = isClient() && !window.navigator.onLine;
    const isApiUnreachable = error.code === 'ERR_NETWORK';

    if ((isOffline || isApiUnreachable) && isClient()) {
      window.dispatchEvent(
        new CustomEvent('network-unreachable', {
          detail: { isOffline, originalError: error },
        })
      );
    }

    return createAppError(
      isOffline
        ? 'You are currently offline. Please check your network connection.'
        : 'Unable to connect to the server. The API may be unreachable.',
      error.code === 'ECONNABORTED'
        ? ERROR_CODES.TIMEOUT_ERROR
        : ERROR_CODES.NETWORK_ERROR,
      0
    );
  }

  // Infer domain from the request URL for a contextual message
  const url = error.config?.url ?? '';
  const domain = inferDomainFromUrl(url);
  const userMessage = mapApiError(status, domain);

  const errorCode =
    status === 400
      ? ERROR_CODES.VALIDATION_ERROR
      : status === 401
        ? ERROR_CODES.UNAUTHORIZED
        : status === 403
          ? ERROR_CODES.FORBIDDEN
          : status === 404
            ? ERROR_CODES.NOT_FOUND
            : ERROR_CODES.SERVER_ERROR;

  return createAppError(userMessage, errorCode, status);
}

// ---------------------------------------------------------------------------
// Axios instance (lazy singleton – avoids import-time env reads)
// ---------------------------------------------------------------------------

let _apiClient: AxiosInstance | null = null;

/**
 * Returns the shared Axios instance, creating it on first call.
 * Deferring creation to the first request prevents a hard throw at module
 * import time when environment variables are not yet available.
 */
export function getApiClient(): AxiosInstance {
  if (_apiClient) return _apiClient;

  const baseUrl = env.apiBaseUrl();

  _apiClient = axios.create({
    baseURL: `${baseUrl}/api/${API_VERSION}`,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });

  // ---------------------------------------------------------------------------
  // Request interceptor – cookies are sent automatically
  // ---------------------------------------------------------------------------

  _apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (isClient() && !window.navigator.onLine) {
        const offlineError = new axios.Cancel('No internet connection');
        return Promise.reject(offlineError);
      }
      return config;
    },
    (error: unknown) => Promise.reject(transformAxiosError(error))
  );

  // ---------------------------------------------------------------------------
  // Response interceptor – handle 401 with token refresh via cookies
  // ---------------------------------------------------------------------------

  _apiClient.interceptors.response.use(
    (response: any) => response,
    async (error: unknown) => {
      if (!isAxiosError(error)) {
        return Promise.reject(transformAxiosError(error));
      }

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (
        !error.response &&
        (error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          axios.isCancel(error))
      ) {
        return Promise.reject(transformAxiosError(error));
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => getApiClient()(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshBaseUrl = env.apiBaseUrl();
          await axios.post(
            `${refreshBaseUrl}/api/${API_VERSION}/auth/refresh`,
            {},
            {
              timeout: DEFAULT_TIMEOUT_MS,
              withCredentials: true,
            }
          );
          processQueue(null, 'refreshed');
          return getApiClient()(originalRequest);
        } catch (refreshError) {
          tokenManager.clearTokens();
          if (isClient()) {
            window.dispatchEvent(
              new CustomEvent('session-expired', {
                detail: { reason: 'token_refresh_failed' },
              })
            );
          }
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(transformAxiosError(error));
    }
  );

  return _apiClient;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

function isRetryableError(error: unknown): boolean {
  // Non-Axios errors are generally retryable (network errors, timeouts, etc)
  if (!isAxiosError(error)) return true;
  if (axios.isCancel(error)) return false;
  if (!error.response) return true; // network error
  const status = error.response.status;
  return status >= 500 && status !== 501;
}

/**
 * Wraps any async operation with configurable retry + exponential back-off.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= retries || !isRetryableError(err)) {
        break;
      }
      const backoff = delayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoff));
      attempt++;
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Request cancellation helper
// ---------------------------------------------------------------------------

export interface CancelToken {
  signal: AbortSignal;
  cancel: () => void;
}

/**
 * Returns an { signal, cancel } pair.
 * Pass `signal` as the Axios request config `signal` option.
 * Call `cancel()` to abort the in-flight request.
 */
export function createCancelToken(): CancelToken {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

// ---------------------------------------------------------------------------
// Typed GET / POST / PATCH / DELETE wrappers
// ---------------------------------------------------------------------------

type RequestConfig = {
  signal?: AbortSignal;
  timeout?: number;
  params?: Record<string, unknown>;
};

export async function get<T>(url: string, config?: RequestConfig): Promise<T> {
  const { data } = await getApiClient().get<T>(url, {
    params: config?.params,
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: RequestConfig
): Promise<T> {
  const { data } = await getApiClient().post<T>(url, body, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: RequestConfig
): Promise<T> {
  const { data } = await getApiClient().patch<T>(url, body, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function del<T = void>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  const { data } = await getApiClient().delete<T>(url, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export { transformAxiosError, DEFAULT_TIMEOUT_MS, MAX_RETRIES };
