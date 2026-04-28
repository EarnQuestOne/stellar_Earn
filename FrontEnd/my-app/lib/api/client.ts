/**
 * Axios-based HTTP client for the StellarEarn API.
 *
 * Features:
 *  - Uses httpOnly cookies for secure token storage (no localStorage)
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
import { env } from '@/lib/config/env';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = env.apiBaseUrl();
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

export const tokenManager = {
  clearTokens(): void {
    if (!isClient()) return;
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

function isAxiosError(error: unknown): error is AxiosError {
  return error !== null && typeof error === 'object' && 'isAxiosError' in error;
}

function hasApiErrorResponse(
  error: AxiosError
): error is AxiosError<ApiErrorResponse> {
  return (
    error.response?.data !== undefined &&
    typeof error.response.data === 'object' &&
    ('statusCode' in error.response.data || 'message' in error.response.data)
  );
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
  const data = hasApiErrorResponse(error) ? error.response.data : undefined;

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
      0
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
        429
      );
    default:
      if (status >= 500) {
        return createAppError(
          message || 'Something went wrong on our end.',
          ERROR_CODES.SERVER_ERROR,
          status
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
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Request interceptor – cookies are sent automatically
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: unknown) => Promise.reject(transformAxiosError(error))
);

// ---------------------------------------------------------------------------
// Response interceptor – handle 401 with token refresh via cookies
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      return Promise.reject(transformAxiosError(error));
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${BASE_URL}/api/${API_VERSION}/auth/refresh`,
          {},
          {
            timeout: DEFAULT_TIMEOUT_MS,
            withCredentials: true,
          }
        );
        processQueue(null, 'refreshed');
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(transformAxiosError(error));
  }
);

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

function isRetryableError(error: unknown): boolean {
  if (!isAxiosError(error)) return false; // non-Axios errors are not retryable
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
  config?: RequestConfig
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
  config?: RequestConfig
): Promise<T> {
  const { data } = await apiClient.patch<T>(url, body, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export async function del<T = void>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  const { data } = await apiClient.delete<T>(url, {
    signal: config?.signal,
    timeout: config?.timeout,
  });
  return data;
}

export { transformAxiosError, DEFAULT_TIMEOUT_MS, MAX_RETRIES };
