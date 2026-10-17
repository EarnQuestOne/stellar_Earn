# Contract Upgrade Authorization and Timelock Policy

This policy defines the governance authorization and waiting-period process for
upgrades to StellarEarn contracts. It complements the deployment, signing,
compatibility, and emergency policies in this directory; it does not define or
implement the contract's upgrade mechanism.

- **Owner:** Contract maintainers, with the security team and the TSC
- **Review cadence:** proposed every six months and after a material governance
  change, upgrade-mechanism change, or relevant security incident
- **Status:** Partially repository-verified; proposed requirements and open
  decisions are identified below

## Purpose and scope

Contract upgrades can change code that controls contract state and user value.
This policy makes the approval, notice, execution, and verification record
clear before an upgrade is authorized or deployed.

It covers an upgrade of an existing deployed contract and upgrade-related
administrative actions, including authorizing an upgrade, changing the upgrade
authority, and scheduling, cancelling, or rescheduling an approved upgrade.
It does not replace the technical implementation of authorization, deployment,
timelocks, migrations, or rollback in a contract or execution system.

## Authorization authority

### Repository-verified behavior

The current contract source exposes `authorize_upgrade`. Its authorization
check requires an authenticated caller that both holds the `SuperAdmin` role
and matches the stored contract-admin address. The source does not identify the
holder of that address, a deployed multisig configuration, or a separate
on-chain approval quorum.

For the governance and deployment process, existing policies require the
following for a mainnet upgrade:

- code-owner review, maintainer approval, security-team review of
  value-bearing code, and a TSC decision where the upgrade changes a contract
  interface, upgrade authority, or economic parameter
  ([DEPLOY_APPROVAL.md](DEPLOY_APPROVAL.md) and
  [APPROVALS.md](../APPROVALS.md));
- a reviewer other than the deployer to confirm that the new WASM hash matches
  a reproducible build of the recorded commit
  ([DEPLOY_APPROVAL.md](DEPLOY_APPROVAL.md)); and
- signing under the documented privileged-operation multisig policy: at least
  five signers and 3-of-5 signatures for routine privileged operations
  ([MULTISIG_THRESHOLD.md](MULTISIG_THRESHOLD.md)).

The proposal may be opened by any contributor through an issue, pull request,
or RFC. Reviewers give the reviews required above; maintainers and the TSC make
the documented governance decisions; and only the authorized signer or signing
set executes the approved action according to [KEY_CEREMONY.md](KEY_CEREMONY.md).
The author or executor is never the sole approver.

### Confirmation required

Maintainers or governance must confirm that the deployed contract-admin address
is controlled by the documented multisig and that the 3-of-5 policy applies to
each upgrade authorization. Until then, the signer threshold is a governance
requirement, not a demonstrated property of the deployed contract.

## Upgrade review requirements

### Existing requirements

Before approval, an upgrade must have the prerequisites in
[DEPLOY_APPROVAL.md](DEPLOY_APPROVAL.md): no applicable change freeze, a
deployment/provenance record, compatibility confirmation, approval for changed
admin-settable values, compliant signing preparation, and a post-deployment
verification plan. The proposal and approval record must be attached to the
pull request, release issue, or deployment issue before signing.

The established compatibility and migration policies require confirmation of
event and storage compatibility, tests using prior-version storage where
applicable, a migration plan and rollback steps for stored-data changes, and
release notes for version and breaking changes
([SCHEMA_COMPAT.md](SCHEMA_COMPAT.md) and
[VERSION_MIGRATION.md](VERSION_MIGRATION.md)).

### Proposed requirements pending adoption

Each upgrade proposal should also state:

- the reason, affected contracts, intended version, source commit, and new
  build or WASM hash;
- security impact, threat or risk assessment, code-review results, test
  results, and relevant audit findings or their absence;
- backward-compatibility, storage-compatibility, and migration risks; and
- the planned execution window, rollback or containment plan, and public
  communication location.

Before execution, publish the final proposal, scheduled time, approval evidence,
and information safe to disclose. Security-sensitive details follow
[DISCLOSURE_EMBARGO.md](DISCLOSURE_EMBARGO.md).

## Timelock policy

### Repository-verified behavior

The repository does not establish an upgrade-specific timelock duration. The
current `authorize_upgrade` source does not show an upgrade timelock,
scheduling function, or on-chain delay enforcement. Any waiting period below
is therefore a governance process requirement, not an on-chain or execution
system guarantee.

### Proposed policy pending approval

For a non-emergency mainnet upgrade, the timelock begins when all required
approvals are recorded and the final proposal, artifact hash, and intended
execution window are published. The proposed minimum delay is **72 hours**.
The record should communicate the start and end times in UTC, the target
network and contract, the approved artifact identifier, the execution window,
and a place for stakeholders to raise concerns.

During the delay, stakeholders may review the published proposal and submit
specific security, compatibility, or governance objections through its linked
issue or RFC. A material change to code, artifact hash, target, migration,
authority, or risk assessment cancels the prior approval and restarts review
and the timelock. A cancellation is recorded and announced. Rescheduling within
the published window without a material change must be recorded; rescheduling
outside that window requires confirmation that the approval remains valid and
a new 72-hour waiting period.

If an upgrade is not executed before its scheduled window expires, it must not
be executed on the expired approval. The proposal must be re-confirmed with a
new execution window and timelock. Maintainers or governance must ratify this
proposed duration, window rule, and objection-handling process before treating
them as binding.

## Emergency upgrades

An upgrade needed for a security-critical condition follows the narrowly scoped
emergency process in [EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md) and
[HOTFIX_POLICY.md](../HOTFIX_POLICY.md). Those policies allow emergency action
only to contain active or imminent harm and expressly exclude an upgrade or
migration that bypasses the documented upgrade-governance process.

Existing emergency authority may be invoked only by the roles and conditions
defined there: for a contract or fund-affecting exploit, an on-call maintainer
escalates to a second maintainer as soon as reachable; the security team and
release/incident roles participate as the applicable policies require. Record
the rationale, evidence, exact scope, rollback or containment plan, approvals,
and execution evidence. The TSC must ratify the action retrospectively, and a
blameless review is required under the existing emergency policies.

No emergency exception to the proposed 72-hour delay, and no bypass of
on-chain controls, is established by this policy. Any such exception requires
explicit governance approval and must still be technically supported by the
deployed mechanism.

## Execution and verification

Before signing, the executor verifies that the transaction or other execution
artifact matches the approved target, source commit, build/WASM hash, network,
contract address, and scheduled window. Signers verify transaction contents on
a trusted display and record the transaction hash afterwards, as required by
[KEY_CEREMONY.md](KEY_CEREMONY.md).

The deployment record must contain the network, contract address, previous and
new WASM hashes for an upgrade, source commit, build details, deployer and
public signer identities, transaction hash, date, and approving record
([DEPLOY_PROVENANCE.md](DEPLOY_PROVENANCE.md)). A maintainer other than the
deployer verifies the deployed artifact, address/network, privileged settings,
core smoke tests, and expected events before announcement
([POST_DEPLOY_VERIFY.md](POST_DEPLOY_VERIFY.md)).

After verification, communicate the result, version, relevant migration or
compatibility information, and any follow-up monitoring to stakeholders. A
failed verification triggers the established pause, rollback, or redeployment
response; this policy does not assume a particular blockchain or upgrade
architecture.

## Ownership and review cadence

The existing deployment policy names contract maintainers, with the security
team and release manager, as its owner; the TSC is the collective technical
authority. This policy proposes the same shared stewardship, with the contract
maintainers as the accountable document owner, pending maintainer confirmation.

The proposed review cadence is every six months and after a material governance
change, change to the upgrade mechanism or authority, or relevant security
incident. That cadence is not a separately adopted requirement until this
policy is ratified through [AMENDMENTS.md](../AMENDMENTS.md).

## Policy status and unresolved decisions

### Existing, repository-verified behavior

- The contract authorization check requires the stored contract-admin address
  and `SuperAdmin` role.
- Existing governance policies require the listed mainnet deployment reviews,
  signing process, provenance record, compatibility review, and independent
  post-deployment verification.
- The contract source does not demonstrate an upgrade timelock, scheduling,
  expiry, or on-chain multisig enforcement.

### Proposed policy requirements

- A 72-hour governance waiting period for non-emergency mainnet upgrades,
  starting after final approval and publication.
- Publication, cancellation, material-change, rescheduling, and expiry rules
  described in the timelock section.
- The review checklist and shared ownership/review cadence in this document.

### Decisions requiring maintainer or governance approval

1. Confirm the deployed contract-admin and `SuperAdmin` arrangement, including
   whether it is controlled by the documented multisig.
2. Confirm that the documented 3-of-5 routine privileged-operation threshold
   applies to upgrade authorization and execution in every deployment.
3. Adopt, change, or reject the proposed 72-hour governance waiting period and
   its execution-window expiry rules.
4. Define any emergency exception to that waiting period, if one is desired,
   without bypassing unsupported on-chain controls.
5. Confirm the accountable owner and formal review cadence for this document.

## Related documents

- [DEPLOY_APPROVAL.md](DEPLOY_APPROVAL.md)
- [MULTISIG_THRESHOLD.md](MULTISIG_THRESHOLD.md)
- [KEY_CEREMONY.md](KEY_CEREMONY.md)
- [SCHEMA_COMPAT.md](SCHEMA_COMPAT.md)
- [VERSION_MIGRATION.md](VERSION_MIGRATION.md)
- [DEPLOY_PROVENANCE.md](DEPLOY_PROVENANCE.md)
- [POST_DEPLOY_VERIFY.md](POST_DEPLOY_VERIFY.md)
- [EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md)
- [AMENDMENTS.md](../AMENDMENTS.md)
