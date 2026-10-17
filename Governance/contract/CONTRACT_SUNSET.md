# Contract Deprecation and Sunset Policy

On-chain contracts cannot be deleted. **Deprecation** tells integrators and users to
stop relying on a deployment; **sunset** is the controlled wind-down before that
deployment is treated as **retired** (frozen, replaced, and no longer supported).
This policy applies to StellarEarn Soroban contracts and their published deployment
addresses.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months and after any contract deprecation or sunset
- **Status:** Active

## Relationship to other policies

| Phase | Primary reference |
|-------|-------------------|
| API and interface deprecation notices | [DEPRECATION_POLICY.md](../DEPRECATION_POLICY.md) |
| Deploying a replacement contract | [DEPLOY_APPROVAL.md](DEPLOY_APPROVAL.md), [DEPLOY_PROVENANCE.md](DEPLOY_PROVENANCE.md) |
| Parameter and admin changes during wind-down | [PARAMETER_CHANGE.md](PARAMETER_CHANGE.md) |
| Pausing during sunset or incident | [EMERGENCY_PAUSE.md](EMERGENCY_PAUSE.md) |
| Event/storage compatibility across versions | [SCHEMA_COMPAT.md](SCHEMA_COMPAT.md) |
| Mainnet timing | [CHANGE_FREEZE.md](CHANGE_FREEZE.md) |

Deprecation notices for **contract entrypoints, events, and error types** must
follow the notice periods in DEPRECATION_POLICY.md. This document covers **whole
contract deployments** and their retirement on chain.

## Definitions

- **Contract version** — A named release line (for example `earn-quest v2`) bound to
  an immutable wasm hash and one or more network deployment addresses recorded in
  DEPLOY_PROVENANCE.md.
- **Deprecated** — The deployment remains callable, but maintainers announce that new
  integrations and new user flows must use the successor. Documentation and
  client defaults point to the replacement.
- **Sunset** — A timed wind-down: new risky or net-new usage is blocked or
  discouraged on chain where possible; existing users can complete withdrawals and
  migrations within published deadlines.
- **Retired** — The deployment is no longer supported, monitored for product
  features, or upgraded. User funds must not remain stranded without a documented
  recovery path.

## Deprecating a contract version

1. **Proposal** — Open an issue or RFC naming the deployment(s), successor
   contract/version, rationale, and earliest sunset start date.
2. **Approval** — Follow RFC_PROCESS.md and VOTING.md when the change affects
   user funds, admin keys, or timelines shorter than DEPRECATION_POLICY.md allows.
3. **Notice** — In the same release window as the decision:
   - Publish a `Deprecated` changelog entry and migration guide (see
     DEPRECATION_POLICY.md).
   - Update deployment records in DEPLOY_PROVENANCE.md with status `deprecated`,
     successor address(es), and links to the migration guide.
   - Announce in project communication channels with the sunset schedule.
4. **Minimum notice** — At least two MAJOR releases or six months from the first
   published deprecation notice before **sunset** actions begin, unless the TSC
   approves a shorter timeline for security (documented in release notes).

## Sunset and retirement

Sunset is executed in ordered stages. Stages may be combined only when approved
in the deprecation RFC and recorded on chain where applicable.

| Stage | Goal | Typical on-chain / ops actions |
|-------|------|--------------------------------|
| 1. Redirect | Stop new dependence | Point SDKs, docs, and frontends at the successor; freeze new feature work on the old deployment. |
| 2. Restrict | Limit new exposure | Disable or cap new deposits/subscriptions via admin parameters (PARAMETER_CHANGE.md); keep exits and migrations enabled. |
| 3. Pause (if needed) | Stop active harm | Use EMERGENCY_PAUSE.md only when required for safety; prefer parameter limits when users still need withdrawals. |
| 4. Migrate | Move remaining state | Run audited migration tooling; publish transaction hashes and verification steps per POST_DEPLOY_VERIFY.md. |
| 5. Retire | End support | Mark deployment `retired` in DEPLOY_PROVENANCE.md; remove from default client config; retain read-only monitoring per CHAIN_MONITORING.md for a defined archival period. |

**Retirement criteria** — A deployment may be marked retired only when:

- The published migration window has ended or remaining balances are accounted for.
- A successor is live and documented, or the TSC records a justified exception.
- Post-sunset verification is complete (POST_DEPLOY_VERIFY.md or a linked sunset
  checklist in the RFC).
- No open security embargo blocks public retirement (DISCLOSURE_EMBARGO.md).

Renouncing admin keys or leaving a contract immutable is irreversible; it requires
the same approvals as a parameter change to privileged roles and must be recorded
with signer identities and transaction hashes.

## User communication

During deprecation and sunset, communications must state:

- Which deployment addresses are affected per network.
- What remains allowed (for example withdrawals only) and until when.
- The successor address and migration steps.
- That **allowlisted or “official” addresses do not guarantee future behaviour** —
  users must follow published migration guidance.

## Ownership and review

- **Document owner:** Contract maintainers, with the security team.
- **Review:** Every six months and within two weeks after any contract enters
  sunset or retirement.
- **Updates:** Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md)
  and are made by pull request limited to the `Governance/` folder.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by
pull request limited to the `Governance/` folder.
