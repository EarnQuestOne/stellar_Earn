# Required Approvals per Change Type

## Purpose

This document is the single place to look up **how many approvals a kind of
change needs, and from whom**. It maps each change type to its required
approvals, names who may give them, and links the policy that governs.

It exists to make a day-to-day question answerable: before opening a pull
request, an author can find their row, and a reviewer can tell whether an
approval is missing.

**What this document does not do.** It creates no new threshold, and it lowers
none. [THRESHOLDS.md](THRESHOLDS.md) controls the approval threshold for every
class of governance change, and it controls in particular wherever another
governance document specifies a lower approval requirement for a licence or
treasury action. A policy may add review steps or a higher threshold, but never
a lower one. Where this table and [THRESHOLDS.md](THRESHOLDS.md) appear to
disagree about a threshold, [THRESHOLDS.md](THRESHOLDS.md) governs. Where this
table and a role's own document disagree about a role's authority, the role's
own document governs, per [ROLES.md](ROLES.md).

## The mapping

| Change type                                                       | Required approvals                                                                                                                                                                                                                                   | Who may approve                                                                                                         | Governing policy                                                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract changes — `contracts/`                                   | Code-owner review **and** maintainer approval; security response team review where the change touches security-relevant or value-bearing code; a TSC decision where it changes a contract interface, the upgrade authority, or an economic parameter | The path's code owners; a maintainer; the security response team; the TSC, which is the maintainers acting collectively | [SUBPROJECTS.md](SUBPROJECTS.md), [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md), [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md), [TSC.md](TSC.md) |
| Contract upgrade process — the upgrade governance document itself | Maintainer approval, plus a TSC decision; the timelock and authorization steps in the upgrade process apply                                                                                                                                          | A maintainer; the TSC                                                                                                   | [TSC.md](TSC.md), [`docs/governance/CONTRACT_UPGRADE_GOVERNANCE.md`](../docs/governance/CONTRACT_UPGRADE_GOVERNANCE.md)                            |
| Backend changes — `BackEnd/`                                      | Owner review plus maintainer approval; **one additional maintainer** where the change touches authentication, funds, or personal data                                                                                                                | The area owner; a maintainer; a second maintainer for auth, funds, or personal data                                     | [SUBPROJECTS.md](SUBPROJECTS.md), [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md), [roles/REVIEWER.md](roles/REVIEWER.md)                             |
| Frontend changes — `FrontEnd/`                                    | Owner review plus maintainer approval; **one additional maintainer** where the change touches authentication, funds, or personal data                                                                                                                | The area owner; a maintainer; a second maintainer for auth, funds, or personal data                                     | [SUBPROJECTS.md](SUBPROJECTS.md), [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md), [roles/REVIEWER.md](roles/REVIEWER.md)                             |
| Subgraph and indexing — `subgraph/`                               | Owner review plus maintainer approval; the reviewer confirms that the indexing stays consistent with the contracts, events, and interfaces it indexes                                                                                                | The area owner; a maintainer                                                                                            | [SUBPROJECTS.md](SUBPROJECTS.md), [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md)                                                                     |
| Cross-area changes — changes that span areas                      | Review from **every affected area's owner** plus a maintainer, and the strictest row that applies to the change                                                                                                                                      | Each affected area's owner; a maintainer                                                                                | [SUBPROJECTS.md](SUBPROJECTS.md), [THRESHOLDS.md](THRESHOLDS.md)                                                                                   |
| Tooling and CI — `scripts/`, `.github/`, root configuration       | A maintainer plus an area reviewer                                                                                                                                                                                                                   | A maintainer; the relevant area reviewer                                                                                | [SUBPROJECTS.md](SUBPROJECTS.md)                                                                                                                   |
| Governance documents — `Governance/`                              | Two maintainers to merge; a change that alters a rule, definition, role, threshold, or process is additionally ratified at the class threshold — **material governance**, two-thirds of non-abstaining ballots, after quorum                         | Maintainers                                                                                                             | [AMENDMENTS.md](AMENDMENTS.md), [CHARTER.md](CHARTER.md), [SUBPROJECTS.md](SUBPROJECTS.md), [THRESHOLDS.md](THRESHOLDS.md)                         |
| Documentation — `docs/`                                           | One maintainer approval; no additional reviewer is required, however large the file is                                                                                                                                                               | A maintainer                                                                                                            | [roles/REVIEWER.md](roles/REVIEWER.md), [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)                                                             |
| Dependency changes                                                | Non-breaking routine updates: one maintainer after CI passes. Major-version bumps: one additional maintainer, plus a migration note. Abandoned, unmaintained, or prohibited packages: explicit TSC approval                                          | A maintainer; a second maintainer for a major bump; the TSC for the exception categories                                | [DEPENDENCY_POLICY.md](DEPENDENCY_POLICY.md)                                                                                                       |
| Hotfix changes                                                    | Approval before deployment by the incident commander or the release manager, plus the security owner for a security fix where available; reviewed by at least one person who did not author it, where circumstances permit                           | A maintainer acting as incident commander or release manager; the security owner                                        | [HOTFIX_POLICY.md](HOTFIX_POLICY.md)                                                                                                               |
| Emergency changes made out of process                             | Retrospective ratification by the TSC within 72 hours, at the quorum that [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md) requires; the acting decision-maker's own vote does not count                                                                   | The TSC, excluding the acting decision-maker from the count                                                             | [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md), [QUORUM.md](QUORUM.md)                                                                                 |
| Licence and re-licensing changes                                  | The **sensitive** class: three-fourths of all eligible voters, after quorum. The public proposal, the compatibility review, and the contributor sign-off in [FORK_POLICY.md](FORK_POLICY.md) are additional steps, not substitutes                   | All eligible voters — the active maintainers                                                                            | [THRESHOLDS.md](THRESHOLDS.md), [FORK_POLICY.md](FORK_POLICY.md), [LICENSING_POLICY.md](LICENSING_POLICY.md)                                       |

Notes on the rows:

- **Contracts carry the highest bar.** They hold and release rewards, so a
  contract change is never satisfied by a single approval. Where the change
  touches security-relevant or value-bearing code, the security response team
  reviews it in addition to the code owner and the maintainer, and it may
  require an out-of-band fix to be prioritised, per
  [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md).
- **Contract interfaces and economic parameters escalate.** A change to a
  public entrypoint, to the upgrade authority, or to an economic parameter such
  as a reward amount is a TSC decision, per the remit in [TSC.md](TSC.md). Where
  such a change is also a treasury matter, the sensitive class in
  [THRESHOLDS.md](THRESHOLDS.md) applies to it.
- **Auth, funds, and personal data get a second maintainer** in the backend and
  the frontend, because those paths are where a mistake costs users money, their
  credentials, or their data. This is an addition to the owner review, not a
  replacement for it.
- **The subgraph is judged against the contracts.** Indexing that does not match
  the on-chain interface is a defect even when the code is correct, so the
  owner review checks the two together.
- **Governance documents need maintainer approval.** This restates what
  [roles/REVIEWER.md](roles/REVIEWER.md) already states, and adds the change
  class and the ratification threshold that [AMENDMENTS.md](AMENDMENTS.md)
  requires. [CHARTER.md](CHARTER.md) carries its own, stricter rule and governs
  itself.
- **A documentation change never needs the extra reviewer.** A change confined
  to documentation does not require the additional maintainer or the security
  review that the code rows carry. In `Governance/` the row's own requirement
  still applies: two maintainers, and the amendment rules for anything that
  alters a rule.

## The lightest documented path

The table above is the ceiling, not the routine. A correction that is small,
single-file, and non-substantive — a typo, a broken link, a formatting fix —
follows the lightest documented path:

- a passing CI run, and
- **one approving review from a maintainer who did not author the change**,
  which is what branch protection requires for every merge into `main`, per
  [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md).

Inside `Governance/` such a correction is also a **routine** change under
[AMENDMENTS.md](AMENDMENTS.md): it may be merged as a routine change without a
full amendment, by simple majority of non-abstaining ballots if it is put to a
vote.

A correction that alters a meaning, a rule, a threshold, or a policy is **not**
non-substantive, however small the diff. It takes the path for its class.

## Rules that apply across change types

- **An author is never the sole approver of their own change.** Branch
  protection requires an approving review from a maintainer who did not author
  the branch ([BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)), and the conflict
  rule in [roles/REVIEWER.md](roles/REVIEWER.md) is that a change is not
  approved by its author as its sole reviewer. Someone else must approve.
- **The strictest applicable requirement governs.** Where a change spans more
  than one kind — a backend change that also updates a contract-facing
  interface, or an amendment that also touches a threshold — the strictest
  requirement in the table applies to the whole change, per
  [THRESHOLDS.md](THRESHOLDS.md).
- **Approvals are recorded in the pull request.** An approval that is not
  recorded on the pull request, the release issue, or the vote record has not
  been given, and a change that requires an approval is not ready to merge.
- **Code-owner review is additive, never substitutable.** A security team
  approval, an additional maintainer, or a TSC decision satisfies an additional
  requirement; it never replaces the review of the owner named in
  `.github/CODEOWNERS` for the changed path, per
  [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md) and
  [roles/REVIEWER.md](roles/REVIEWER.md).
- **Approval is not merging.** A reviewer's approval satisfies the review
  requirement; merging to the default branch is a maintainer action, per
  [roles/REVIEWER.md](roles/REVIEWER.md) and [ROLES.md](ROLES.md).
- **A conflicted reviewer hands off or recuses.** Someone with a material
  conflict of interest does not give the approval, and the search for an
  unconflicted approver starts before the change is blocked, per
  [QUORUM.md](QUORUM.md) and [roles/REVIEWER.md](roles/REVIEWER.md).
- **Scope and size are not approval counts.** The size and split guidance in
  [PR_GUIDELINES.md](PR_GUIDELINES.md) is about reviewability; it does not raise
  or lower the number of approvals.

## Worked examples

**A backend change that touches authentication.** A fix in `BackEnd/` that
changes how a session token is validated needs the area owner's review and a
maintainer's approval, plus **one additional maintainer**, because it touches
authentication. It does not need the security response team, which is required
for security-relevant and value-bearing code rather than for authentication
changes as such — though the owner may ask for that review if the change looks
security-relevant. If the same pull request also changes an API shape the
frontend consumes, it becomes a cross-area change: the frontend owner's review
is required too.

**A contract change that adds an event.** A new event in `contracts/` needs the
code owner's review and a maintainer's approval. Because it is value-bearing
code, the security response team reviews it as well. Because it changes a
contract interface, it is escalated to the TSC, which records the decision
against the upgrade process in
`docs/governance/CONTRACT_UPGRADE_GOVERNANCE.md`. The corresponding subgraph
change is a cross-area change and needs the subgraph owner's review, and the
release that ships it follows [RELEASE_POLICY.md](RELEASE_POLICY.md) and
[VERSIONING.md](VERSIONING.md).

**A governance typo.** Correcting a broken link in a single file in this folder
needs two maintainers, because `Governance/` is the one area that always does.
It is a routine change under [AMENDMENTS.md](AMENDMENTS.md), needs no full
amendment, and takes the lightest documented path above.

## Related documents

- [THRESHOLDS.md](THRESHOLDS.md) — change classes and approval thresholds;
  it governs this document.
- [SUBPROJECTS.md](SUBPROJECTS.md) — per-area ownership and the review each
  area requires.
- [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md) — who is requested for review
  on a changed path.
- [roles/REVIEWER.md](roles/REVIEWER.md) — what an approval means, and its
  limits.
- [roles/MAINTAINER.md](roles/MAINTAINER.md) — merge authority and
  responsiveness.
- [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md) — review of
  security-relevant and value-bearing code.
- [AMENDMENTS.md](AMENDMENTS.md) and [CHARTER.md](CHARTER.md) — approval of
  governance document changes.
- [DEPENDENCY_POLICY.md](DEPENDENCY_POLICY.md) — dependency review and the
  categories that need TSC approval.
- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) and
  [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md) — emergency approval and
  retrospective ratification.
- [FORK_POLICY.md](FORK_POLICY.md) and
  [LICENSING_POLICY.md](LICENSING_POLICY.md) — licence change and third-party
  code.
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) — the merge requirements
  every change meets.
- [ROLES.md](ROLES.md) — the permission matrices behind the "who may approve"
  column.
