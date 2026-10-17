# Backend API-Key Issuance and Revocation Policy

## Overview
This document defines the official API-key issuance, scoping, rotation, and revocation policy for **EarnQuestOne/stellar_Earn**. Strict management of API credentials is vital for securing backend services, external integrations, and Stellar blockchain transaction endpoints against unauthorized access.

---

## 1. Issuance & Secure Storage
- **Cryptographic Generation**: All API keys must be generated using cryptographically secure pseudorandom number generators (CSPRNG) with high entropy.
- **Hashed Storage**: Plaintext API keys must **never** be stored in the database. Only salted cryptographic hashes (such as Argon2id or HMAC-SHA256) are persisted, while the plaintext key is displayed to the user exactly once upon creation.
- **Prefix Standard**: API keys must feature a recognizable project prefix (e.g., `earn_live_` or `earn_test_`) followed by random characters to assist in automated secret scanning and leakage detection.

---

## 2. Scoping & Least Privilege
- **Granular Permissions**: Every API key must be tied to specific permission scopes (e.g., `read:reports`, `write:transactions`, `admin:keys`). Wildcard or unrestricted administrative scopes are strictly prohibited for standard client integrations.
- **Rate Limiting & Quotas**: Each issued API key must be subject to strict per-key rate limiting and concurrency thresholds enforced at the API gateway level.

---

## 3. Rotation & Expiration
- **Maximum Lifetime**: API keys must have a defined maximum expiration period (not exceeding 90 days for production keys).
- **Rotation Workflows**: Systems must support seamless key rotation by allowing multiple active keys per account during a transition grace period.

---

## 4. Revocation Mechanisms
- **Instant Invalidation**: Revocation requests (triggered manually via dashboard or automatically upon secret leakage detection) must take effect immediately by updating database status flags and invalidating Redis cache entries.
- **Leakage Response**: Any API key detected in public code repositories or log streams must be automatically revoked within 15 minutes.

---

## 5. Ownership & Review Cadence
- **Primary Owner**: Security Engineering & Backend Infrastructure Team.
- **Review Cadence**: Audited annually or following any security incident related to credential exposure.