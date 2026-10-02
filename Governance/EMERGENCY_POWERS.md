# Emergency Decision Powers and Constraints

This document defines when a project member may make a decision outside the
normal governance process to stop or contain an active emergency, what that
person is and is not allowed to do, how long those powers last, and how the
decision is ratified afterwards. It exists so that urgent action is possible
without creating a standing path around StellarEarn's decision-making rules.

Emergency powers are an exception, not a mode of operation. They are narrow,
time-bound, and always subject to retroactive ratification by the maintainers
acting as the project's Technical Steering Committee (TSC) per
`Governance/README.md`. An action that cannot be reversed or ratified does not
belong in this document's scope.

## Definitions

- **Emergency** — an active or imminent event that threatens user funds,
  production availability, security, or data integrity, where waiting for the
  next scheduled decision would materially increase the harm.
- **Emergency action** — the smallest change needed to stop, contain, or
  safely roll back that event.
- **Acting decision-maker** — the single, identifiable person who invokes
  emergency powers and is accountable for the action and its record.
- **Retroactive ratification** — the TSC's after-the-fact review that upholds
  the emergency action, upholds it with conditions, or requires it to be
  reverted.

## Scope: what qualifies

Emergency powers may be used only when **all** of the following hold:

1. There is a concrete, active or imminent harm to users, funds, production,
   security, or data integrity.
2. The normal path — consensus in `Governance/README.md`, a hotfix approval
   under [HOTFIX_POLICY.md](HOTFIX_POLICY.md), or the contract-upgrade
   governance process — cannot be completed within the time available.
3. The intended action is the smallest viable intervention and has a defined,
   tested rollback.

Typical actions in scope:

- Pausing or gating a contract function that is being drained or abused.
- Revoking a leaked credential, key, token, or integration secret.
- Rolling back a defective deployment or releasing a targeted hotfix.
- Disabling a compromised dependency, integration, or endpoint.
- Freezing a compromised account or suspending a single abusive caller.

## Scope: what is excluded

Emergency powers never authorise:

- changes to governance documents, this policy, or the decision-making
  process itself;
- changes to [MAINTAINERS.md](MAINTAINERS.md), the maintainer roster, or
  `.github/CODEOWNERS`;
- new grants, sponsorships, or unbudgeted spending commitments;
- contract upgrades or migrations that bypass the documented upgrade
  governance process;
- actions that cannot be reversed or compensated;
- any action taken to conceal or under-report an incident;
- any action directed at a person rather than at the harm.

Work in these areas follows its normal process even during an emergency.

## Who may act

| Situation                                              | Default acting decision-maker                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Security incident (disclosure, key or data compromise) | Security owner, or the security team member on call                        |
| Production outage or defective release                 | Release manager, or the incident commander for the incident                |
| Contract or fund-affecting exploit                     | On-call maintainer, escalating to a second maintainer as soon as reachable |

The acting decision-maker must be a current maintainer or a role holder
explicitly delegated by the TSC for that class of incident. When the primary
role holder is unreachable and harm is ongoing, any maintainer in
[MAINTAINERS.md](MAINTAINERS.md) may act, then notify the role holder and the
TSC immediately.

Only one person acts on a given emergency action. If a second person needs to
extend or change the action, they record it as a separate action with its own
ratification deadline.

## Constraints on the powers

1. **Minimal.** Use the smallest change that stops the harm. Do not bundle
   unrelated fixes, refactors, or feature work into an emergency action.
2. **Reversible first.** Prefer reversible controls (pause, revoke, roll back,
   feature-flag off) over destructive or irreversible ones.
3. **Time-bound.** Emergency authority expires 72 hours after the action
   unless the TSC extends it in writing. It is not a continuing mandate.
4. **Least privilege.** Invoke only the access needed for this one action, and
   revoke any elevated access granted for it as soon as the action completes.
5. **Separation of duties.** The acting decision-maker cannot be the sole
   ratifier. Where circumstances permit, a second maintainer acknowledges the
   action before it is deployed; if that is impossible, it is documented.
6. **Full record.** Every invocation produces an emergency decision record
   (see below), whether or not the action succeeds.
7. **No precedent.** An emergency action does not amend any policy, does not
   create a precedent for normal work, and does not authorise follow-on work
   beyond containment.

## Retroactive ratification

Every emergency action must be ratified after the fact.

1. **File the record.** Within 24 hours of acting, the acting decision-maker
   files an emergency decision record in the repository (an issue comment or a
   pull request against the repository) and notifies the TSC.
2. **TSC review.** The TSC reviews the record within 72 hours of the action,
   following the decision-making process in `Governance/README.md`. Review
   requires a quorum of a majority of active maintainers.
3. **No self-ratification.** The acting decision-maker's own vote does not
   count toward the majority required to uphold their action.
4. **Outcome.** The TSC records exactly one of:
   - **Ratified** — the action stands and any temporary control is unwound on
     the agreed schedule.
   - **Ratified with conditions** — the action stands only if the stated
     follow-up issues (postmortem, permanent fix, tests, documentation) are
     opened and owned.
   - **Rejected** — the action is reverted or compensated within the window
     the TSC records, and a follow-up issue captures the corrective work.
5. **Default on inaction.** If the TSC does not reach a decision within 72
   hours, the action lapses and reverts to the pre-emergency state unless a
   majority explicitly extends it. Silence is not approval.
6. **Escalation.** If an action is rejected but reverting it would itself cause
   greater harm, the TSC records the reason for the deferred reversion and the
   point at which it must be completed.

## Emergency decision record

The record is a short, public-where-safe document containing:

- date and time (UTC) the action was taken;
- the acting decision-maker and the role they acted under;
- the triggering incident or issue link;
- the harm observed and the evidence for it;
- the action taken, its exact scope, and the affected systems or paths;
- alternatives considered and why they were not viable in time;
- the rollback or compensation plan and its verification;
- the ratification deadline and the eventual TSC outcome.

Security-sensitive details follow the private disclosure process in
[templates/DISCLOSURE_TEMPLATE.md](templates/DISCLOSURE_TEMPLATE.md) and
[COC_REPORTING.md](COC_REPORTING.md) rather than being published in the open
record.

## After the emergency

- A blameless review is completed within two working days, consistent with
  [HOTFIX_POLICY.md](HOTFIX_POLICY.md) and the postmortem template in
  [templates/POSTMORTEM_TEMPLATE.md](templates/POSTMORTEM_TEMPLATE.md).
- Any structural fix that outlives containment goes through the normal review,
  release, and — where relevant — contract-upgrade governance process.
- If the review shows a standing policy gap, it is opened as a normal
  governance issue and changed through the process in `Governance/README.md`,
  never through these emergency powers.

## Policy maintenance

This policy is reviewed at least once per year by the TSC and updated through a
normal, small governance pull request. Amendments to this document may not be
made under the emergency powers it defines.

## Related documents

- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) – code freeze and emergency-change controls.
- [RELEASE_POLICY.md](RELEASE_POLICY.md) – release approval, rollback, and the release manager role.
- [MAINTAINERS.md](MAINTAINERS.md) – the maintainers who form the TSC.
- [SAFETY_POLICY.md](SAFETY_POLICY.md) – safety and harassment response.
- [decisions/README.md](decisions/README.md) – the ADR log used to record durable decisions.
