# Contract Admin-Key Custody Policy

This document defines the custody policy for the administrative keys that control the StellarEarn on-chain contracts. It states where those keys live, who may access them, how access is granted and revoked, and the cadence for reviewing and updating this document.

This policy complements the other contract governance documents in this folder. It does not replace the runbook for generating and using signing keys ([
KEY_CEREMONY.md](KEY_CEREMONY.md)), the policy governing parameter changes ([PARAMETER_CHANGE.md](PARAMETER_CHANGE.md)), or the emergency-pause controls ([EMERGENCY_PAUSE.md](EMERGENCY_PAUSE.md)).

## Scope

This policy applies to every administrative key that can authorize a state-changing operation on a deployed StellarEarn contract, including:

- the contract admin key (upgrades, initialization, and admin-only configuration),
- any operational key that holds a privileged role on chain (for example pauser, treasury sweep, or oracle administration), and
- the recovery material for any of the above.

It does not cover ordinary developer credentials, CI/service accounts, or backend secrets, which are governed by the security and access-control policies.

## Where admin keys live

Admin keys must never be stored in the repository, in plain-text files, in build artifacts, or in any location readable by general contributors. They live only in the following approved locations:

1. **Hardware signing devices** - the primary cold storage for maintainer admin keys. Devices are issued to named holders, remain in the holder's physical custody, and are never shared between people.
2. **Managed secrets stores** - for operational keys used by automated processes. Access is role-based, logged, and restricted to the service identities and the named holders defined in the roster below.
3. **Sealed recovery backups** - a single encrypted copy of each key's recovery material, held in a physically secured location controlled by the Technical Steering Committee (TSC).

No admin key may exist in more than the locations above. Any exception requires written approval from the TSC and must be recorded in the access register.

## Who may access admin keys

Access is granted to named individuals only, never to roles in the abstract. The minimum set of holders is:

- **Admin-key holders** - at least two and at most three maintainers, each holding one share of the admin key on a hardware device. At least two holders must approve any admin action.
- **Second approvers** - two maintainers who do not hold a share but review and cosign admin actions. They provide independent checks on the intent and parameters of each action.
- **Security team liaison** - reviews access grants and revocations and audits the access register on the cadence below.

No single person may hold a share and also serve as a second approver for the same action. The roster of holders and approvers is maintained in the access register and is reviewed as part of this document's review cadence.

## Access grant and revocation

- Access is granted by a TSC decision recorded in the decision log, following the approval requirements in [APPROVALL.md](APPROVAL.md).
-  Every grant or revocation is entered in the access register with the holder, the key, the date, and the approving decision.
- Access is revoked immediately when a holder steps down or is removed, following the access-revocation checklist in [OFFBOARDING.md](OFFBOARDING.md).
- Keys are rotated on any suspected compromise, on any change in the holder roster, and on the scheduled cadence below.

## Operational rules

- Admin actions are prepared offline and signed on the hardware device; the signing device is never connected to a network while holding a share.
-  The full set of signatures and the intended effect of an action are recorded in the decision log before broadcast.
-  No admin action is taken without a linked issue or RFC that describes the change and its rollback plan.
-  Admin keys are never used from a personal workstation, a shared machine, or a CI runner.

## Ownership

This document is owned by the TSC and maintained by the contract maintainers. The TSC is accountable for keeping it current and for ensuring the access register matches the roster described here. Questions and corrections are raised as a governance issue and resolved through the process in [AMENDMENTS.md](AMENDMENTS.md).

## Review and update cadence

- **Quarterly review** - the TSC reviews this document and the access register together with the security team liaison and records the result in the decision log.
- **Event-driven update** - the document is updated within five business days of any change to the holder roster, the approver roster, the key locations, or the signing process.
- **Annual rotation review** - the TSC confirms that every admin key has been rotated within the preceding twelve months or records a justification for deferral.
- **Change management** - all edits go through a governance pull request limited to this folder and require the approvals defined in [APPROVALS.md](APPROVALL.md).

## Related documents

- [KEY_CEREMONY.md](KEY_CEREMONY.md)
- [PARAMETER_CHANGE.md](PARAMETER_CHANGE.md)
- [EMERGENCY_PAUSE.md](EMERGENCY_PAUSE.md)
- "[CHANGE_FREEZE.md](CHANGE_FREEZE.md)
- [CHAIN_MONITORING.md](CHAIN_MONITORING.md)
- [APPROVAL.md](APPROVAL.md)
- "[OFFBOARDING.md](OFFBOARDING.md)
