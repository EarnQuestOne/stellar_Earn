# Contract Oracle Integration and Trust Policy

Oracle data can move funds, so it is treated as untrusted input. This policy states what is trusted, how inputs are validated, and what happens when the oracle fails.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months and when an oracle is added or changed
- **Status:** Active

## Trust assumptions

Each integrated oracle is listed with its operator, update mechanism, and the assumption we make (for example, a single signed feed or a multi-signer quorum). Adding or changing an oracle requires maintainer approval and a security review.

## Input validation

Contracts must check the signer or source, freshness (maximum age), sequence or nonce, and sane bounds before using a value. Out-of-range, stale, or replayed values are rejected.

## Failure behaviour

If the oracle is unavailable or invalid, the contract fails closed: affected actions are refused rather than falling back to unverified data. Use of the emergency pause is described in EMERGENCY_PAUSE.md.

## Testing

Contract tests cover stale data, wrong signer, replay, and boundary values for every oracle input.

## Ownership and review

Owned by the contract maintainers. Reviewed every six months and on any oracle change.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
