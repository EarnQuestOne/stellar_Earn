# Contract Deployment Approval Policy

A deployment puts code in control of user funds, and once it is on-chain it cannot be quietly undone. This policy defines the approvals that must be recorded *before* any contract is deployed to a network.

- **Owner:** Contract maintainers, with the security team and the release manager
- **Review cadence:** every release and at least every 6 months
- **Status:** Active

## Scope

Covers every write to a network: a first deployment, an upgrade of an existing contract, a redeployment under a new address, and any testnet deployment. It applies to the deployment itself; the change being deployed is approved separately under [APPROVALS.md](../APPROVALS.md).

## Approvals required

| Deployment | Required approvals | Who approves |
| ---------- | ------------------ | ------------ |
| Testnet | One approval | A maintainer other than the deployer |
| Mainnet — new contract or first mainnet deployment | Code-owner review, a maintainer approval, and security-team review of the value-bearing code; a TSC decision where it changes a contract interface, the upgrade authority, or an economic parameter | The path's code owners; a maintainer; the security response team; the TSC |
| Mainnet — upgrade or redeployment | The mainnet row above, plus a reviewer who confirms the new WASM hash matches a reproducible build of the recorded commit | As above, with a reviewer who did not perform the deployment |

Who may give each approval, and the change classes behind them, are defined in [APPROVALS.md](../APPROVALS.md), [roles/REVIEWER.md](../roles/REVIEWER.md), [roles/SECURITY_TEAM.md](../roles/SECURITY_TEAM.md), and [TSC.md](../TSC.md). Where this document and those disagree about a threshold or a role's authority, they govern.

## Prerequisites before approval

An approval is only valid once the following are satisfied for the deployment being approved:

- no active freeze blocks it ([CHANGE_FREEZE.md](CHANGE_FREEZE.md));
- the deployment record and provenance are prepared ([DEPLOY_PROVENANCE.md](DEPLOY_PROVENANCE.md));
- for an upgrade, compatibility with existing events and storage is confirmed ([SCHEMA_COMPAT.md](SCHEMA_COMPAT.md));
- any admin-settable value it changes is approved ([PARAMETER_CHANGE.md](PARAMETER_CHANGE.md));
- signing keys and the multisig threshold are used as [KEY_CEREMONY.md](KEY_CEREMONY.md) requires; and
- a verification plan exists and will be run afterwards ([POST_DEPLOY_VERIFY.md](POST_DEPLOY_VERIFY.md)).

## Separation of duties

The deployer is never the sole approver of their own deployment. At least one approver did not author or perform it, and on mainnet at least two people are always required, however small the change.

## Recording

Approvals are recorded on the pull request, the release issue, or the deployment issue before the transaction is signed; an approval that is not recorded has not been given. The deployment itself is recorded as [DEPLOY_PROVENANCE.md](DEPLOY_PROVENANCE.md) describes.

## Emergency deployments

A security fix or emergency change may deploy on the shorter path in [EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md) and [HOTFIX_POLICY.md](../HOTFIX_POLICY.md): the incident commander or release manager approves before deployment, the security owner approves where available, and the TSC ratifies retrospectively.

## Ownership and review

Owned by the contract maintainers, with the security team and the release manager. Reviewed at each release and at least every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
