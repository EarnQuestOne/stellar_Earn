import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenManager, getApiClient } from './client';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';

describe('tokenManager', () => {
  it('getAccessToken returns null (tokens are httpOnly cookies)', () => {
    expect(tokenManager.getAccessToken()).toBeNull();
  });

  it('getRefreshToken returns null (tokens are httpOnly cookies)', () => {
    expect(tokenManager.getRefreshToken()).toBeNull();
  });

  it('setTokens is a no-op (backend sets cookies)', () => {
    // Should not throw
    tokenManager.setTokens({ accessToken: 'test', refreshToken: 'test' });
  });

  it('clearTokens is a no-op (backend clears cookies on logout)', () => {
    // Should not throw
    tokenManager.clearTokens();
  });
});

describe('CSRF token handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('captures CSRF token from response headers', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/auth/profile', () => {
        return HttpResponse.json(
          { stellarAddress: 'GTEST', role: 'USER' },
          { headers: { 'x-csrf-token': 'test-csrf-token-123' } }
        );
      })
    );

    await getApiClient().get('/auth/profile');

    // Subsequent requests should include the CSRF token
    server.use(
      http.post('http://localhost:3000/api/v1/quests', async ({ request }) => {
        const csrfHeader = request.headers.get('x-csrf-token');
        if (csrfHeader === 'test-csrf-token-123') {
          return HttpResponse.json({ success: true });
        }
        return HttpResponse.json(
          { message: 'Invalid CSRF token' },
          { status: 403 }
        );
      })
    );

    const response = await getApiClient().post('/quests', { title: 'test' });
    expect(response.data).toEqual({ success: true });
  });
});

describe('response interceptor - refresh failure', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('dispatches session-expired event when refresh fails', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('session-expired', eventSpy);

    server.use(
      http.get('http://localhost:3000/api/v1/auth/profile', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }),
      http.post('http://localhost:3000/api/v1/auth/refresh', () => {
        return HttpResponse.json(
          { message: 'Refresh failed' },
          { status: 401 }
        );
      })
    );

    try {
      await getApiClient().get('/auth/profile');
    } catch {
      // expected
    }

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const event = eventSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ reason: 'token_refresh_failed' });

    window.removeEventListener('session-expired', eventSpy);
  });
});

describe('getApiClient – lazy initialisation (FE-021)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the same instance on repeated calls (singleton)', () => {
    const first = getApiClient();
    const second = getApiClient();
    expect(first).toBe(second);
  });

  it('creates the client with the correct baseURL', () => {
    const client = getApiClient();
    expect(client.defaults.baseURL).toBe('http://localhost:3000/api/v1');
  });

  it('module import does not throw even when env var is unset', async () => {
    const original = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      delete (process.env as Record<string, string | undefined>)
        .NEXT_PUBLIC_API_BASE_URL;

      // Re-import the module – should not throw
      const mod = await import('./client');
      expect(typeof mod.getApiClient).toBe('function');
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_API_BASE_URL = original;
      }
    }
  });
});
