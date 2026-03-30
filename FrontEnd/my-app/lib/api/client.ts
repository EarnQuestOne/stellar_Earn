/**
 * Axios-based HTTP client for the StellarEarn API.
 *
 * Features:
 *  - Automatic Authorization header injection
 *  - Transparent JWT access-token refresh on 401 (with request queuing)
 *  - Configurable retry with exponential back-off for network / 5xx errors
 *  - Per-request cancellation via AbortController
 *  - 30-second default timeout
 *  - Typed error transformation
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
import type { ApiErrorResponse, AuthTokens } from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const API_VERSION = 'v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

/** Keys used to persist auth tokens in localStorage / sessionStorage */
const ACCESS_TOKEN_KEY = 'authToken'; // keep backward compat with existing code
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRES_IN_KEY = 'tokenExpiresIn';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

export const tokenManager = {
  getAccessToken(): string | null {
    if (!isClient()) return null;
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(ACCESS_TOKEN_KEY)
    );
  },

  getRefreshToken(): string | null {
    if (!isClient()) return null;
    return (
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_KEY)
    );
  },

  setTokens(tokens: AuthTokens): void {
    if (!isClient()) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(TOKEN_EXPIRES_IN_KEY, tokens.expiresIn.toString());
  },

  clearTokens(): void {
    if (!isClient()) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_IN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRES_IN_KEY);
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
// Error transformation
// ---------------------------------------------------------------------------

function transformAxiosError(error: AxiosError<ApiErrorResponse>): AppError {
  const status = error.response?.status;
  const data = error.response?.data;

  const message = Array.isArray(data?.message)
    ? data.message.join('; ')
    : (data?.message ?? error.message);

  if (!status) {
    // Network / timeout error
    return createAppError(
      'Network connection failed. Please check your internet connection.',
      error.code === 'ECONNABORTED'
        ? ERROR_CODES.TIMEOUT_ERROR
        : ERROR_CODES.NETWORK_ERROR,
      0,
    );
  }

  switch (status) {
    case 400:
      return createAppError(message, ERROR_CODES.VALIDATION_ERROR, 400);
    case 401:
      return createAppError(message, ERROR_CODES.UNAUTHORIZED, 401);
    case 403:
      return createAppError(message, ERROR_CODES.FORBIDDEN, 403);
    case 404:
      return createAppError(message, ERROR_CODES.NOT_FOUND, 404);
    case 429:
      return createAppError(
        'Too many requests. Please slow down.',
        ERROR_CODES.SERVER_ERROR,
        429,
      );
    default:
      if (status >= 500) {
        return createAppError(
          message || 'Something went wrong on our end.',
          ERROR_CODES.SERVER_ERROR,
          status,
        );
      }
      return createAppError(message, ERROR_CODES.SERVER_ERROR, status);
  }
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/${API_VERSION}`,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor – inject access token
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(transformAxiosError(error)),
);

// ---------------------------------------------------------------------------
// Response interceptor – handle 401 with token refresh
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Token refresh on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        tokenManager.clearTokens();
        processQueue(error, null);
        isRefreshing = false;
        return Promise.reject(transformAxiosError(error));
      }

      try {
        const { data } = await axios.post<AuthTokens>(
          `${BASE_URL}/api/${API_VERSION}/auth/refresh`,
          { refreshToken },
          { timeout: DEFAULT_TIMEOUT_MS },
        );
        tokenManager.setTokens(data);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenManager.clearTokens();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(transformAxiosError(error));
  },
);

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

function isRetryableError(error: unknown): boolean {
  const axiosErr = error as AxiosError;
  if (!axiosErr.response) return true; // network error
  const status = axiosErr.response.status;
  return status >= 500 && status !== 501;
}

/**
 * Wraps any async operation with configurable retry + exponential back-off.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = INITIAL_RETRY_DELAY_MS,
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

export async function get<T>(
  url: string,
  config?: RequestConfig,
): Promise<T> {
  const { data } = await apiClient.get<T>(url, {
    params: config?.params,
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<T> {
  const { data } = await apiClient.post<T>(url, body, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<T> {
  const { data } = await apiClient.patch<T>(url, body, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function del<T = void>(
  url: string,
  config?: RequestConfig,
): Promise<T> {
  const { data } = await apiClient.delete<T>(url, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export { DEFAULT_TIMEOUT_MS, MAX_RETRIES };
