# Contract Key-Ceremony and Signing Runbook

Signing keys control contracts and treasury funds. This runbook describes how keys are generated, stored, used, and rotated.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months and after any key event
- **Status:** Active

## Generation

Keys are generated on trusted, offline or hardware-backed devices by the key holder, with at least one witness. Secret keys are never emailed, pasted into chat, or committed to the repository.

## Storage

Prefer hardware wallets. Backups are encrypted and stored in separate secure locations. Mainnet signing uses multisig with a documented threshold, and no single person can authorise a change.

## Signing

Verify transaction contents on a trusted display before signing, check them against the approved change record, and record the transaction hash afterwards.

## Rotation and compromise

Rotate keys on a schedule and whenever a holder leaves (OFFBOARDING.md). If a key may be compromised, notify the security team immediately, pause where needed (EMERGENCY_PAUSE.md), and replace the key.

## Ownership and review

Owned by the security team. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
