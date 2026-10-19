# Backend Authentication and Session Policy

This policy defines how StellarEarn authenticates users and services, how long
credentials remain valid, and how sessions are invalidated. It applies to the
NestJS API, wallet-signature login, refresh-token rotation, administrative
sessions, and machine credentials.

- **Owner:** Backend maintainers, with the security team as co-owner
- **Review cadence:** every 6 months, and after any authentication incident
- **Status:** Active
- **Related:** [API keys](API_KEYS.md), [Secrets rotation](SECRETS_ROTATION.md), [Audit logging](AUDIT_LOGGING.md), [Required approvals](../APPROVALS.md)

## Authentication methods

| Method | Use | Baseline controls |
|--------|-----|-------------------|
| Wallet signature challenge | Primary user login | Single-use nonce, domain and network binding, signature verified server-side |
| Access token (JWT) | Authenticated API calls | Short lifetime, signed with the current key, audience and issuer checked |
| Refresh token | Obtaining a new access token | Rotating, single-use, hashed at rest, bound to the session |
| API key | Service-to-service and partner integrations | Scoped, hashed at rest, independently revocable |
| Administrative session | Support and operations consoles | Strong authentication, short lifetime, step-up for sensitive actions |

Passwords, if supported for any internal account, are hashed with a memory-hard
algorithm and never stored or transmitted in plaintext.

## Token lifetimes

| Credential | Lifetime | Notes |
|------------|----------|-------|
| Wallet login nonce | 5 minutes | Single use; invalidated after verification or expiry |
| Access token | 15 minutes | Never extended in place |
| Refresh token (absolute) | 30 days | Re-authentication required after this limit |
| Refresh token (idle) | 7 days | Unused sessions expire automatically |
| Administrative session | 8 hours, with a 15-minute step-up window for sensitive actions | Re-authentication required for privilege changes |
| API key | 90 days maximum | Rotation supported with an overlap window |

Lifetimes may be shortened for high-risk roles or during an incident. Lengthening
a lifetime requires security-team approval and an update to this table.

## Token handling

- Access tokens are short-lived bearer credentials. Clients keep them in memory
  and must not persist them in `localStorage` or in URLs.
- Refresh tokens are delivered in `HttpOnly`, `Secure`, `SameSite` cookies and
  stored server-side only as a salted hash.
- Tokens include a unique session identifier, the subject, the issued-at and
  expiry times, the issuer, the audience, and the authentication method.
- Signing keys are rotated on a defined schedule. Tokens are verified against a
  key set that supports an overlap window during rotation.
- Tokens must be rejected when the signature, issuer, audience, expiry, or
  session state is invalid. Algorithms are allowlisted; `none` is never accepted.
- Tokens and authorization codes are never written to logs, error trackers, or
  analytics events.

## Session invalidation

A session is invalidated immediately when:

- the user logs out or disconnects the wallet;
- the refresh token is reused after rotation, which also revokes the token
  family;
- the account password or recovery method changes;
- a role, permission, or account-status change makes the existing session
  invalid;
- an administrator revokes the session or the account;
- a compromise is suspected.

Revocation is enforced server-side, not only by clearing client storage. The API
checks session state for sensitive operations even when the access token has not
yet expired. A global revocation for a user invalidates every active refresh
token and bumps a session version that access tokens must match.

## Wallet authentication

- The server issues a nonce bound to the requested domain, network, and a short
  expiry, and consumes it exactly once.
- The signed message states the action, domain, nonce, and issue time to prevent
  replay across applications.
- The server verifies the signature against the claimed public key and confirms
  that the key controls the account being accessed.
- Linking a wallet to an existing account requires an authenticated session and
  a fresh signature.

## Auditing and monitoring

Authentication successes, failures, refreshes, revocations, and privilege
changes emit audit events under [Audit logging](AUDIT_LOGGING.md). Alerts cover
repeated failures, refresh-token reuse, impossible-travel signals where
available, and spikes in revocations. Authentication errors returned to clients
are deliberately generic.

## Ownership and review

The backend maintainers own this policy; the security team reviews token
lifetimes, key rotation, and incident findings. The policy is reviewed every six
months and whenever the authentication provider, token format, or wallet
integration changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
