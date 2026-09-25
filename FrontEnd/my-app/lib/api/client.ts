/**
 * Axios-based HTTP client for the StellarEarn API.
 *
 * Features:
 * - Uses httpOnly cookies for secure token storage (no localStorage)
 * - Transparent JWT access-token refresh on 401 (with request queuing)
 * - CSRF double-submit cookie protection (token captured from responses,
 *   attached to mutating requests automatically)
 * - Configurable retry with exponential back-off for network / 5xx errors
 * - Automatic bounded retry for idempotent GET requests, with equal jitter
 *   and `Retry-After` support (see `lib/api/retry-policy`)
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
import {
  DEFAULT_RETRY_POLICY,
  isRetryableStatus,
  parseRetryAfterMs,
  withRetryPolicy,
  type RetryPolicy,
} from '@/lib/api/retry-policy';
import type { ApiErrorResponse, AuthTokens } from '@/lib/types/api.types';
import { env } from '@/lib/config/env';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_VERSION = 'v1';
/** Integer major version sent via X-API-Version header (see docs/backend/API_VERSIONING_POLICY.md). */
export const API_VERSION_NUM = '1';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

/**
 * Retry timing for automatic GET replay.
 *
 * Deliberately tighter than `DEFAULT_RETRY_POLICY`. A browser user is waiting
 * on the response, so inheriting the 1s/2s/4s schedule meant a persistent 5xx
 * stalled the UI for ~7s before the error surfaced. A 250ms base with a 2s cap
 * bounds the worst case at ~1.75s, which is a better experience and also keeps
 * request-level tests inside the default 5s test timeout.
 *
 * A server-sent `Retry-After` still takes precedence, capped at `maxDelayMs`.
 */
const GET_RETRY_POLICY: RetryPolicy = {
  ...DEFAULT_RETRY_POLICY,
  initialDelayMs: 250,
  maxDelayMs: 2_000,
};

// ---------------------------------------------------------------------------
// Token management (httpOnly cookies – tokens are not accessible via JS)
// ---------------------------------------------------------------------------

function isClient(): boolean {
  return typeof window !== 'undefined';
}

export const tokenManager = {
  getAccessToken(): string | null {
    // httpOnly cookies are not readable by JavaScript.
    // Authentication state is determined by the backend accepting the cookie.
    return null;
  },
  getRefreshToken(): string | null {
    return null;
  },
  setTokens(_tokens: AuthTokens): void {
    // No-op: the backend sets httpOnly cookies via Set-Cookie headers.
  },
  clearTokens(): void {
    // No-op: the backend clears cookies on logout via Set-Cookie headers.
  },
};

// ---------------------------------------------------------------------------
// CSRF double-submit cookie handling
// ---------------------------------------------------------------------------

let csrfToken: string | null = null;

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

  // Preserve the server's Retry-After hint. This error is about to lose its
  // Axios shape, and with it `response.headers`, so the retry layer would
  // otherwise never see the header the backend documents sending on 429.
  const retryAfter = error.response?.headers?.['retry-after'];

  return createAppError(
    userMessage,
    errorCode,
    status,
    retryAfter === undefined ? undefined : { retryAfter }
  );
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
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': API_VERSION_NUM,
    },
    withCredentials: true,
  });

  // ---------------------------------------------------------------------------
  // Request interceptor – attach CSRF token, check offline status
  // ---------------------------------------------------------------------------

  _apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (isClient() && !window.navigator.onLine) {
        const offlineError = new axios.Cancel('No internet connection');
        return Promise.reject(offlineError);
      }

      // Attach CSRF double-submit token for mutating requests
      if (
        csrfToken &&
        config.method &&
        !['get', 'head', 'options'].includes(config.method.toLowerCase())
      ) {
        config.headers['x-csrf-token'] = csrfToken;
      }

      return config;
    },
    (error: unknown) => Promise.reject(transformAxiosError(error))
  );

  // ---------------------------------------------------------------------------
  // Response interceptor – capture CSRF token, handle 401 with token refresh
  // ---------------------------------------------------------------------------

  _apiClient.interceptors.response.use(
    (response: any) => {
      // Capture CSRF token from response headers for double-submit pattern
      const newCsrf = response.headers['x-csrf-token'];
      if (newCsrf) {
        csrfToken = newCsrf;
      }
      return response;
    },
    async (error: unknown) => {
      if (!isAxiosError(error)) {
        return Promise.reject(transformAxiosError(error));
      }

      // Capture CSRF token from error responses too (e.g. 401 still carries the header)
      const newCsrf = error.response?.headers?.['x-csrf-token'];
      if (newCsrf) {
        csrfToken = newCsrf;
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
          // Refresh token is carried automatically via httpOnly cookie
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

/**
 * Decides whether a failure is worth replaying.
 *
 * Important: by the time an error surfaces from the Axios instance it has
 * usually been through `transformAxiosError` in the response interceptor, so
 * it is an `AppError` and no longer carries `isAxiosError` or `response`.
 * Classifying only on the Axios shape would therefore treat every failed
 * request as retryable, including permanent 4xx responses. Both shapes are
 * handled here.
 */
export function isRetryableError(error: unknown): boolean {
  if (axios.isCancel(error)) return false;

  if (isAxiosError(error)) {
    if (!error.response) return true; // network error
    return isRetryableStatus(error.response.status);
  }

  // Transformed shape: `statusCode` 0 means the request never got a response
  // (offline, DNS failure, timeout), which is exactly the transient case.
  const statusCode = (error as AppError | null | undefined)?.statusCode;
  if (typeof statusCode === 'number') {
    return statusCode === 0 || isRetryableStatus(statusCode);
  }

  // Unrecognised errors stay retryable, preserving the long-standing
  // behaviour of the exported `withRetry` helper for non-HTTP operations.
  return true;
}

/**
 * Extracts a server-supplied `Retry-After` hint from an error.
 * Returns null when the header is absent or unparseable, in which case the
 * caller falls back to computed exponential back-off.
 */
export function getRetryAfterMs(error: unknown): number | null {
  if (isAxiosError(error)) {
    return parseRetryAfterMs(error.response?.headers?.['retry-after']);
  }

  // `transformAxiosError` stashes the header here before the Axios shape is
  // lost, so the hint still reaches the retry layer.
  const details = (error as AppError | null | undefined)?.details;
  return parseRetryAfterMs(details?.retryAfter);
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

// ---------------------------------------------------------------------------
// In-flight GET coalescing
// ---------------------------------------------------------------------------
// Concurrent identical GETs (same URL + params) share a single network request
// instead of each hitting the network. The entry is cleared when the promise
// settles, so a later identical GET issues a fresh request.

const inFlightGets = new Map<string, Promise<unknown>>();

/**
 * Coalesce concurrent calls that share `key` onto a single in-flight promise.
 * Exposed for unit testing and reuse.
 */
export function coalesceRequest<T>(
  key: string,
  run: () => Promise<T>
): Promise<T> {
  const existing = inFlightGets.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = run().finally(() => {
    inFlightGets.delete(key);
  });
  inFlightGets.set(key, promise);
  return promise;
}

function buildGetKey(url: string, params?: Record<string, unknown>): string {
  if (!params) {
    return url;
  }
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return serialized ? `${url}?${serialized}` : url;
}

export async function get<T>(url: string, config?: RequestConfig): Promise<T> {
  const runRequest = async (): Promise<T> => {
    const { data } = await getApiClient().get<T>(url, {
      params: config?.params,
      signal: config?.signal,
      timeout: config?.timeout,
    });
    return data;
  };

  // GET is idempotent, so replaying it after a transient failure cannot cause
  // duplicate side effects. Retries are bounded and jittered.
  const runWithRetry = (): Promise<T> =>
    withRetryPolicy(runRequest, {
      policy: GET_RETRY_POLICY,
      isRetryable: isRetryableError,
      retryAfterMs: getRetryAfterMs,
    });

  // Requests carrying an abort signal bypass coalescing: one caller aborting
  // must not cancel the shared promise for other callers.
  if (config?.signal) {
    return runWithRetry();
  }

  return coalesceRequest<T>(buildGetKey(url, config?.params), runWithRetry);
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

export {
  transformAxiosError,
  DEFAULT_TIMEOUT_MS,
  MAX_RETRIES,
  GET_RETRY_POLICY,
};
