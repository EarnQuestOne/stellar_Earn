# Session Expired UX Flow

When the JWT refresh token expires or becomes invalid, API requests return 401. The Axios interceptor attempts a transparent refresh, but when that also fails, the user needs clear feedback and a path to re-authenticate.

---

## Architecture

```
Axios interceptor (401 response → refresh fails)
  ├── dispatchEvent('session-expired') ← bridges HTTP layer → React tree
  └── Promise.reject(refreshError)     ← callers still handle errors normally

SessionManager (listens for 'session-expired' event on window)
  ├── shows modal: "Session Expired"
  ├── "Connect Wallet" → logout() + open wallet connection modal
  └── "Dismiss" → logout()
```

Tokens are stored as httpOnly cookies set by the backend (`auth_token` for the access JWT, `refresh_token` for the refresh token). The frontend never reads or writes token values directly — cookies are sent automatically with requests via `withCredentials: true`.

The HTTP interceptor lives outside React, so a DOM `CustomEvent` (`session-expired`) is used to bridge into the component tree. The `SessionManager` component, already mounted globally in the root layout, listens for this event and shows a modal.

---

## Flow

1. A 401 response is received by the Axios response interceptor
2. The interceptor tries `POST /auth/refresh` — the refresh token is carried automatically via httpOnly cookie
3. If refresh succeeds → new cookies are set by the backend, queued requests are retried
4. If refresh fails:
   - `window.dispatchEvent(new CustomEvent('session-expired', ...))` fires
   - The failed request is rejected (callers handle normally)
5. `SessionManager` receives the event and shows a modal:
   - **"Session Expired"** title with explanation text
   - **"Connect Wallet"** button → calls `logout()` then opens `WalletConnectionModal`
   - **"Dismiss"** button → calls `logout()` without opening the wallet modal
6. `logout()` calls `POST /auth/logout`, which clears both cookies via `Set-Cookie` headers

---

## Key Files

| File                                      | Role                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/api/client.ts`                       | Axios instance, CSRF handling, response interceptor — refresh failure handling |
| `components/auth/SessionManager.tsx`      | Event listener + session-expired modal UI                                      |
| `components/auth/SessionManager.test.tsx` | Unit tests for the session-expired flow                                        |
| `lib/api/client.test.ts`                  | Unit tests for interceptor refresh-failure behavior (event dispatch)           |
| `tests/e2e/auth.spec.ts`                  | E2E test for the session-expired modal appearance                              |

---

## Event Contract

```typescript
// Dispatched by client.ts when token refresh fails
window.dispatchEvent(
  new CustomEvent('session-expired', {
    detail: { reason: 'token_refresh_failed' },
  })
);
```

Any component can listen for this event on `window` if needed.

---

## Design Decisions

- **httpOnly cookies** (not localStorage): Tokens are inaccessible to JavaScript, preventing XSS-based theft. The backend sets them via `Set-Cookie` headers and clears them on logout.
- **CustomEvent pattern** (not Zustand/Context): The Axios interceptor runs outside the React tree; dispatching a DOM event is the cleanest bridge.
- **CSRF double-submit cookie**: The backend issues a CSRF token via `x-csrf-token` response header and `__Host-csrf-token` cookie. The frontend captures the header value and attaches it to mutating requests (POST/PUT/DELETE/PATCH).
- **Separate `isSessionExpired` state**: Distinguishes this modal from the proactive "Session Expiring" warning modal (which shares the same component but has different copy and buttons).
