# Backend Contract-Testing Policy

Contract tests protect the boundary between services. This policy describes when they are required and how they are run.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## When required

Any HTTP or message interface consumed by another service or by the frontend needs consumer/provider contract tests, including the Soroban/Stellar integration boundary and outbound webhooks.

## How it works

Consumers publish the requests and responses they rely on. Providers verify those expectations in CI. A provider change that breaks a consumer expectation fails the build.

## Versioning

Breaking changes follow API_VERSIONING_POLICY.md and the deprecation policy. Contracts are versioned with the interface they describe.

## CI expectations

Contract verification runs on every pull request that touches an interface. Failures block merge; waivers need maintainer approval and a tracking issue.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
