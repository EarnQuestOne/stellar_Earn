# Backend Audit Logging for Sensitive Actions

Audit logs let us answer who did what, when, and to what. This policy defines which backend actions must be logged and how the logs are protected.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Actions that must be audited

Authentication events (login, logout, failed attempts, token refresh), role or permission changes, payout and reward approvals or rejections, quest creation, edits and deletion by privileged users, API key and secret changes, data exports and deletions, and administrative actions.

## Required fields

Timestamp (UTC), actor id and role, action, target type and id, outcome (success or failure), request id, source IP, and a short reason or changed-fields summary.

## What must not be logged

Passwords, tokens, private keys, secrets, and full personal data. Log identifiers and changed field names instead of values where values are sensitive.

## Integrity and retention

Audit logs are append-only, kept separately from application logs, access-restricted, and retained for at least 12 months. Gaps or tampering are reported as security incidents.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months and whenever a new sensitive action is added.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
