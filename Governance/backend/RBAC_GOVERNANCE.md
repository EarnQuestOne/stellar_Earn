# Backend Authorization and RBAC Governance

This policy defines the role model used by StellarEarn backend services, how
permissions are assigned and reviewed, and the controls around privileged
access. It applies to API guards, service-to-service calls, administrative
consoles, and any operation that acts on behalf of a user or the platform.

- **Owner:** Backend maintainers, with the security team as co-owner
- **Review cadence:** every 6 months, and quarterly for privileged access
- **Status:** Active
- **Related:** [Audit logging](AUDIT_LOGGING.md), [API keys](API_KEYS.md), [Roles](../ROLES.md), [Required approvals](../APPROVALS.md)

## Principles

- Authorization is enforced server-side. Hiding a control in the UI is not an
  access control.
- Access is denied by default. A route or operation must explicitly grant the
  permission it requires.
- Permissions follow least privilege and are scoped to the smallest resource
  boundary that satisfies the task.
- A user may not approve their own privileged request or grant themselves a role.
- Separation of duties applies to financial, security, and production-access
  operations: the person who prepares an action is not the person who approves
  it.

## Role model

| Role | Typical permissions |
|------|---------------------|
| User | Read and update their own profile, submit quest work, view their own payouts |
| Creator | Create and manage their own quests and review submissions for those quests |
| Reviewer | Review submissions assigned to them; no payout or role administration |
| Moderator | Moderate content and suspend accounts within policy; no financial changes |
| Support | Read limited account context and perform approved support actions; no role grants |
| Administrator | Manage platform configuration and roles, subject to separation of duties |
| Service | Act only within the scopes granted to its API key or workload identity |

Roles are additive only when the combination is reviewed. A role that grants
both financial execution and role administration requires security approval and
an explicit exception in this document.

## Assignment and removal

- Role grants and revocations are recorded as auditable events with the actor,
  target, role, reason, and ticket or approval reference.
- Standard role changes require one authorized approver. Administrator grants
  and any access to production secrets require two approvers, one of whom is not
  the requester.
- Privileged support access is time-bound, scoped to a specific account or
  incident, and automatically expires.
- Access is removed within one business day of a role change, offboarding, or
  contract end. Emergency removal may be immediate.
- Role assignments are reviewed quarterly. The review confirms that every active
  privileged role still has a business need.

## Permission changes

- A permission change is proposed by pull request with the affected routes,
  guards, roles, and tests.
- The change includes negative tests proving that an unauthorized role is denied.
- Permission changes that affect personal data, payouts, or production
  configuration require security review.
- A permission is removed by revoking it from the role definition and confirming
  that no active workflow depends on it. Removing a permission is a breaking
  change for affected integrations and follows [API versioning](API_VERSIONING.md)
  where the API surface changes.
- Role and permission definitions are version-controlled. Ad-hoc database edits
  are prohibited except in a documented emergency.

## Break-glass access

Break-glass access is available only to restore service or contain a security
incident. It requires an explicit reason, is time-limited, produces a high-priority
audit event, and is reviewed within two business days. The review confirms that
the access was necessary and that any temporary permission has been removed.

## Verification and monitoring

- Automated tests cover allowed and denied access for every protected route.
- Authorization failures emit audit events without leaking whether the resource
  exists.
- Alerts fire on repeated denied attempts, grants of high-risk roles, and use of
  break-glass access.
- Access reviews and their evidence are retained for the period defined by the
  security retention schedule.

## Ownership and review

The backend maintainers own authorization code; the security team owns the role
model and approves privileged changes. The full role model and all privileged
assignments are reviewed quarterly; this policy is reviewed every six months and
after any authorization incident.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
