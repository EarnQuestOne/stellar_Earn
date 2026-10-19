# Contract Dual-Control Code Review Policy

Any change to contract code affects the security, integrity, and safety of on-chain state and user funds. This policy defines the dual-control code review standard, requiring two independent reviewers for all contract code changes before they can be merged.

- **Owner:** Contract maintainers, with the security team and the Technical Steering Committee (TSC)
- **Review cadence:** Every 6 months and after any critical contract security incident
- **Status:** Active

## Purpose and Scope

Contract vulnerabilities are difficult and costly to remediate once deployed on-chain. Dual control ensures that no single individual has the sole authority to approve and merge changes affecting smart contracts, minimizing the risk of inadvertent bugs, malicious changes, or unverified assumptions.

This policy applies to:
- All source files and dependencies under `contracts/`.
- Contract configuration, build scripts, optimization flags, and toolchain configurations (`Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`).
- Contract interfaces, storage definitions, data structures, and contract-related migration scripts.

## Dual-Control Review Requirement

Every pull request modifying contract code requires approvals from at least **two independent reviewers** before merging:

1. **Independent Maintainer / Code Owner Review:** At least one designated contract code owner or maintainer must conduct a thorough code review.
2. **Independent Secondary Reviewer / Security Reviewer:** A second maintainer or a member of the security team must review and approve the pull request independently.
3. **Separation of Duties:**
   - The pull request author cannot serve as one of the two reviewers.
   - Self-approvals, automated bot approvals, and approvals from non-maintainers cannot satisfy this dual-control requirement.
   - For changes touching value-bearing logic, token transfers, escrow handling, access control, or upgrade mechanics, at least one of the two reviewers must be a member of the security response team.

## Review Verification Criteria

Each reviewer is responsible for verifying:

- **Correctness and Invariants:** State transitions preserve system invariants, balance arithmetic prevents underflows/overflows, and error conditions revert cleanly.
- **Access Control:** Privileged entrypoints enforce explicit authorization (`require_auth()`) and adhere to role-based access control.
- **Storage and Upgradability:** Storage keys comply with [STORAGE_KEYS.md](STORAGE_KEYS.md), data structures remain schema-compatible ([SCHEMA_COMPAT.md](SCHEMA_COMPAT.md)), and upgrade paths follow [UPGRADE_AUTHORIZATION.md](UPGRADE_AUTHORIZATION.md).
- **Test Coverage:** New logic and edge cases are validated by unit and regression tests, and all continuous integration (CI) checks pass.
- **Deterministic and Reproducible Builds:** Code builds cleanly without warnings and conforms to [REPRODUCIBLE_BUILD.md](REPRODUCIBLE_BUILD.md) and [TOOLCHAIN_POLICY.md](TOOLCHAIN_POLICY.md).

## Exceptions and Emergency Fixes

No bypass of dual-control code review is permitted for standard pull requests. In the event of an urgent security incident or live vulnerability, any emergency patch must adhere to [EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md) and [HOTFIX_POLICY.md](../HOTFIX_POLICY.md), requiring dual sign-off from the Incident Commander and Security Lead prior to deployment, followed by retrospective ratification by the TSC within 72 hours.

## Ownership and Review Cadence

This policy is owned by the Contract Maintainers, in consultation with the Security Team and the TSC. It must be reviewed at least once every six months, or following any high-severity incident involving smart contract operations.

## Amendments

Amendments to this policy must follow [AMENDMENTS.md](../AMENDMENTS.md) and [THRESHOLDS.md](../THRESHOLDS.md), requiring pull request approval and ratification under the governance standards limited to the `Governance/` folder.
