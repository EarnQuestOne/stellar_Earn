# CI/CD Governance and Required Checks

This document is the normative reference for **which CI checks are required**
before a change can merge into `main`, what each check covers, and **who, if
anyone, may bypass them**. It is the policy behind the "pass all required CI
checks" requirement in [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) and
[APPROVALS.md](APPROVALS.md).

Nothing here changes application behaviour or how a workflow is written. It
records the existing gate structure so contributors know what must be green and
operators know what may never be waived casually.

## Enforcement

`main` is a protected branch. Direct pushes and force-pushes are prohibited;
every change merges through a pull request that:

1. passes **all required checks** in the table below, and
2. has **at least one approving review from a maintainer who did not author the
   branch** ([APPROVALS.md](APPROVALS.md), [roles/REVIEWER.md](roles/REVIEWER.md)).

Required status checks are configured on the repository ruleset that protects
`main` (Settings → Rules → `protect`), which maintainers manage. A workflow that
is not listed below may still run and inform review, but it is not a merge
blocker.

## Required checks

Each area exposes a single **gate** job that aggregates its workflow's granular
jobs, so the required set stays stable when a sub-job is added or renamed.
Requiring the gate — not each sub-job — is deliberate.

| Required check                            | Workflow                  | Covers                                                                     |
| ----------------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| **Backend CI Gate**                       | `backend-ci.yml`          | Toolchain preflight, build, lint/format, and the OpenAPI generation check. |
| **Integration Tests Gate**                | `backend-integration.yml` | Backend integration tests.                                                 |
| **Contract CI Gate**                      | `contract-ci.yml`         | Soroban contract build and tests.                                          |
| **Lint, Typecheck, Format, Test & Build** | `frontend-ci.yml`         | Frontend lint, typecheck, format, unit tests, and production build.        |
| **Module changelog discipline**           | `backend-changelog.yml`   | Every backend module change carries its changelog entry.                   |
| **Gitleaks & .env guard**                 | `secret-scan.yml`         | Secret scanning and the `.env` guard.                                      |
| **Axe Accessibility Smoke Tests**         | `accessibility.yml`       | Automated accessibility smoke tests.                                       |

Notes:

- The `*-gate` jobs fail if any job they depend on fails, so a red gate means
  the underlying job is red; open the workflow run for the specific failure.
- `frontend-vitest-cache.yml` and `testnet-canary-deployment.yml` are not PR
  merge blockers: the canary pipeline runs on pushes to `main` after merge.
- Checks that fail because of a flaky external service are re-run, not bypassed;
  a check that is persistently flaky is fixed or removed from the required set
  through this policy, never waived per-PR.

## Bypass authority

Required checks exist to stop an unverified change reaching `main`. There is no
routine bypass.

- **An author can never bypass a required check on their own change.** A red
  required check is either fixed or the PR is closed.
- **Emergency bypass is narrow and TSC-authorized.** A required check may be
  skipped only to contain an active emergency as defined in
  [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md) or to land a targeted fix under
  [HOTFIX_POLICY.md](HOTFIX_POLICY.md). The acting decision-maker must be a
  current maintainer or a role holder delegated by the TSC, and the exception
  is time-bound (72 hours unless the TSC extends it in writing).
- **Ratification is mandatory and separate.** Every bypass produces an emergency
  decision record and is ratified retroactively by the TSC (quorum of a majority
  of active maintainers; the acting decision-maker's own vote does not count).
  If the TSC does not ratify within 72 hours, the action lapses and reverts.
  Silence is not approval.
- **Repository administrators manage the ruleset bypass list.** Adding or
  removing a bypass actor is a maintainer/TSC decision and is recorded in the
  decision log; it is not a per-incident, self-service action.
- **Offboarding removes bypass access.** When a maintainer steps down or is
  removed, they are taken off the protected-branch/ruleset bypass list as part
  of [OFFBOARDING.md](OFFBOARDING.md).

Emergency powers never authorize changes to this document, to the governance
process, to the maintainer roster, or to `.github/CODEOWNERS`
([EMERGENCY_POWERS.md](EMERGENCY_POWERS.md)).

## Changing this policy

Amendments to the required-check set or the bypass rules are governance changes
and follow [AMENDMENTS.md](AMENDMENTS.md), with the review requirements in
[APPROVALS.md](APPROVALS.md). Adding or removing a required check is a
substantive change even when the diff is a single row.

## Related documents

- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) — protected branches and PR requirements.
- [APPROVALS.md](APPROVALS.md) — who must approve which change class.
- [PR_GUIDELINES.md](PR_GUIDELINES.md) — pull request size, scope, and splitting.
- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) — code-freeze and emergency-change controls.
- [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md) — scope, limits, and ratification of urgent actions.
- [DEPENDENCY_POLICY.md](DEPENDENCY_POLICY.md) — dependency updates (a common reason a check turns red).
- [OFFBOARDING.md](OFFBOARDING.md) — access and bypass-list revocation.
