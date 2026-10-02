# Contribution Ladder

## Purpose

This document is the project's answer to one question: **how does someone who
wants to do more in this project actually get to do more?** It names the rungs,
states the criteria for reaching each one, and defines what counts as evidence
when a promotion is proposed.

It exists because the roles themselves were documented without the path between
them. [roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md) lists the ladder in four
bullets; [ROLES.md](ROLES.md) says a contributor moves to reviewer "by
demonstrating sustained contribution" without saying what that means or who
decides. This document fills that gap. It creates no new authority: every rung
below carries exactly the powers already documented in its role document, and
every promotion decision is made by the process already documented in
[MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) and [AMENDMENTS.md](AMENDMENTS.md).

**The two governing principles:**

1. **Earned by demonstrated work, never by time served.** No rung has a minimum
   tenure. A calendar does not promote anyone.
2. **There is no obligation to climb.** Contributing well at any rung is
   complete, valuable, recognised work. Nothing on this ladder is a gate on
   having your contributions accepted, and nothing on it requires anyone to
   give up time or code ownership by staying put.

## The ladder at a glance

| Rung | Role        | What you gain                                                 | What it costs you                        | Detail                                       |
| ---- | ----------- | ------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| 1    | Contributor | Public standing; your work is credited                        | Nothing                                  | [roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md) |
| 2    | Reviewer    | Your approval counts toward a review requirement in your area | A review turnaround expectation          | [roles/REVIEWER.md](roles/REVIEWER.md)       |
| 3    | Maintainer  | Merge authority, a TSC seat, a governance vote                | Merge responsibility and response duties | [roles/MAINTAINER.md](roles/MAINTAINER.md)   |

**Specialist roles sit alongside the ladder, not above it.** Triager, release
manager, and security response team member are lateral appointments with their
own remits ([ROLES.md](ROLES.md)). Holding one does not promote you, and none is
a prerequisite for the next rung. A triager may never be a maintainer, and a
maintainer is always implicitly a triager.

```
   rung 3   maintainer      merge authority · TSC seat · governance vote
      ▲
      │
   rung 2   reviewer        your approval counts in your area
      ▲
      │
   rung 1   contributor     submit · participate · be credited
```

The arrows point up, because movement on this ladder is earned by what the
person below has already demonstrated.

## Rung 1 — Contributor

**Entry.** Automatic. Opening your first issue or pull request makes you a
contributor. There is no application, no approval, and no gate.

**Criteria to have arrived.** None. This rung exists so that the first
contribution is never conditional on anything.

**Evidence.** The merged work itself.

## Rung 2 — Reviewer

**What the rung adds.** Your approval satisfies the review requirement for
changes in the areas you are appointed for, and you may request changes or block
a change that violates a documented policy, per
[roles/REVIEWER.md](roles/REVIEWER.md).

**Criteria.** All four must hold.

1. **A sustained history of useful reviews in a named area.** "Sustained" means
   a record spanning multiple changes over time, not one good review. Useful
   means the review caught something real: a defect, a missing test, a security
   implication, a policy violation.
2. **Endorsement.** A maintainer or an existing reviewer of that area endorses
   the appointment.
3. **Maintainer agreement.** The current maintainers agree, per
   [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md).
4. **The ability to say no.** Evidence of declining or handing off a review
   outside your area, per the scope rule in
   [roles/REVIEWER.md](roles/REVIEWER.md). A reviewer who approves on a glance
   is not yet ready for the authority.

**What is explicitly not required:** a fixed number of merged pull requests, a
minimum contribution volume, prior maintainer or triager experience, or any
sponsorship by anyone other than an area maintainer or reviewer.

**Evidence.**

| Signal                                   | Where it is visible               | What it demonstrates                     |
| ---------------------------------------- | --------------------------------- | ---------------------------------------- |
| Merged pull requests in the area         | Repository history                | Working knowledge of the area            |
| Reviews left on others' pull requests    | Pull-request threads              | Judgement; the core signal               |
| Issues triaged, reproduced, or confirmed | Issue threads                     | Ability to assess a report on its merits |
| A review that caught a real defect       | The pull request it was caught on | The review was worth having              |
| Hand-offs and declines out of area       | Review threads                    | Scope discipline                         |

Reviews are read as evidence of judgement, not as a count. A reviewer who
catches three subtle regressions is better placed than one who leaves thirty
rubber-stamp approvals.

**Process.** Raise the evidence in a public issue or pull request, as
[MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) requires for any nomination;
the appointment is then recorded alongside the roster in
[MAINTAINERS.md](MAINTAINERS.md). Note that the roster file is the record, while
`.github/CODEOWNERS` controls automatic review routing and lives outside
`Governance/`, so a `CODEOWNERS` update is a separate, code-scoped change, per
[CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md).

## Rung 3 — Maintainer

**What the rung adds.** Merge authority on the default branch, a seat on the
[Technical Steering Committee](TSC.md) — which is the maintainers acting
collectively — and a vote in governance decisions, per
[roles/MAINTAINER.md](roles/MAINTAINER.md).

**Criteria.** All four must hold.

1. **A sustained record in the specific area being proposed.** The record must
   cover both contributions _and_ reviews, and it must be scoped: an applicant
   is proposed for named areas, not for the repository as a whole by default.
2. **Sponsorship by an existing maintainer**, as recorded in
   [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md).
3. **A successful election** at the maintainer-election threshold — a
   **material governance** change, requiring **two-thirds of non-abstaining
   ballots** after quorum, per [THRESHOLDS.md](THRESHOLDS.md) and
   [QUORUM.md](QUORUM.md).
4. **Acceptance of the standing obligations** — the
   [Code of Conduct](CODE_OF_CONDUCT.md), the
   [safety policy](SAFETY_POLICY.md), and, where the areas touch
   security-relevant or value-bearing code, the private disclosure route in
   [`SECURITY.md`](../SECURITY.md).

**What is explicitly not required:** seniority, having held the reviewer or
triager role formally, or any prior governance vote. Reviewer standing is the
normal route and makes criterion 1 easy to satisfy, but a maintainer who never
held a formal reviewer appointment may be elected on the strength of the
evidence.

**Evidence.** The same signals as the reviewer rung, at greater depth, plus:

| Signal                                                | Where it is visible                              | What it demonstrates          |
| ----------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| Merged changes a maintainer chose to merge            | Repository history                               | Stewardship, not authorship   |
| Resolution of cross-area disagreements                | [decisions/README.md](decisions/README.md)       | Judgement beyond one area     |
| Incident or security participation                    | The relevant private record, summarised publicly | Can be trusted under pressure |
| Governance participation — votes, reviews, amendments | Decision records                                 | Takes the process seriously   |
| Mentorship of contributors and reviewers              | [MENTORSHIP.md](MENTORSHIP.md)                   | Multiplies the project        |

**Process.** Follow [ONBOARDING_MAINTAINER.md](ONBOARDING_MAINTAINER.md) end to
end: nomination open at least **7 calendar days**, election, acceptance of the
conduct obligations, scoped access grants, then the roster update. The candidate
does not vote on their own election, and per
[MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) a newly elected maintainer
receives **only** the rights approved for their listed responsibilities.

**Access is scoped, not blanket.** A maintainer proposed for the frontend is not
granted release or security rights by appointment.

## Promotion evidence

This section defines what "evidence" means everywhere on the ladder, because the
word was being used loosely across documents.

**Valid evidence.**

- **Public, verifiable repository history** — merged pull requests, reviews,
  issue triage, and decision records. Anyone can check it.
- **A stated scope.** The area or areas being proposed for, named explicitly.
  Scope is part of the evidence, not an afterthought.

**Not valid evidence.**

- **Time served.** Length of membership, age of the account, or the number of
  calendar days since a first contribution. No rung has a tenure requirement.
- **Volume alone.** A large number of merged pull requests shows activity, not
  judgement. Small, careful, well-reviewed work outranks volume.
- **Assertion without a record.** A claim of "sustained contribution" with
  nothing to link is not evidence; it is a claim. The nomination links the
  record.
- **Advocacy or seniority in the community.** Popularity is not competence, and
  being early to the repository is not merit.
- **Existing role as a shortcut.** Holding a lateral role does not satisfy
  another rung's criteria, and being sponsored does not replace evidence.

**Where the evidence lives.** In the nomination itself — a public issue or pull
request that a maintainer opens, per
[MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md). A promotion is not
negotiated privately and announced afterwards, and it is not granted silently.

**Falsifiable by design.** Evidence is public and checkable, so a promotion that
someone disputes can be examined rather than argued about. Objections follow
[CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md); recorded dissent is captured
per [DISSENT.md](DISSENT.md).

## Moving back down, and coming back

The ladder is bidirectional, and that is deliberate.

- **Stepping back voluntarily.** Anyone may step down at any time without a
  vote and without giving a reason, per
  [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md). Volunteers are recognised
  as emeritus by default, per [OFFBOARDING.md](OFFBOARDING.md).
- **Stepping back for inactivity.** Sustained inactivity without notice may
  result in removal by consensus after notice. Activity is re-established by
  participating, not by waiting out a period.
- **Emeritus is not the bottom of the ladder.** Emeritus maintainers keep their
  recognition and are credited, but hold no merge, voting, or governance rights
  and do not count toward quorum, per [OFFBOARDING.md](OFFBOARDING.md). They
  remain welcome to review as community members.
- **Coming back.** A returning maintainer is re-appointed through the same
  process used for a new one — the evidence is the record of what they have
  done since. Nobody is locked out by having stepped down.
- **Stepping down is not a demotion.** Choosing to stop reviewing or stop
  triaging is a legitimate decision, not a fall down the ladder.

## Common misconceptions

| Claim                                                                 | What the policy says                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| "You have to be a contributor for a year first."                      | No rung has a tenure requirement. Evidence of judgement, not elapsed time.                                                               |
| "Merged PR count is the metric."                                      | It is a weak signal. Judgement on other people's work is the strong one.                                                                 |
| "The triager role is a step toward maintainer."                       | It is lateral. It does not advance the ladder and is not required for it.                                                                |
| "Promotion is the project repaying you."                              | It is a responsibility first — merge authority and review duty — and a privilege second, per [roles/MAINTAINER.md](roles/MAINTAINER.md). |
| "You must ask permission to step down."                               | You may step down at any time, without a vote.                                                                                           |
| "Governance changes need fewer approvals because they are just docs." | They need two maintainers, and a rule change is ratified at the material-governance threshold, per [APPROVALS.md](APPROVALS.md).         |

## Related documents

- [roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md) — the contributor role and the
  four-rung summary this document expands.
- [roles/REVIEWER.md](roles/REVIEWER.md) — reviewer scope, what an approval
  means, and the responsiveness target.
- [roles/MAINTAINER.md](roles/MAINTAINER.md) — maintainer duties, rights, and
  merge authority.
- [ROLES.md](ROLES.md) — the responsibility and permission matrices, and the
  specialist roles.
- [MAINTAINERS.md](MAINTAINERS.md) — the roster, where appointments are
  recorded.
- [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) — nomination, election,
  removal, and voluntary departure.
- [ONBOARDING_MAINTAINER.md](ONBOARDING_MAINTAINER.md) — the step-by-step path
  into the maintainer rung, including access grants.
- [OFFBOARDING.md](OFFBOARDING.md) — stepping down, access revocation, and
  emeritus status.
- [MENTORSHIP.md](MENTORSHIP.md) — how new contributors are supported on the way
  up.
- [THRESHOLDS.md](THRESHOLDS.md) and [QUORUM.md](QUORUM.md) — the vote a
  maintainer election must clear.
- [APPROVALS.md](APPROVALS.md) — the approvals a promotion's recording PR needs.
- [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md) — how review routing follows an
  appointment.
- [AMENDMENTS.md](AMENDMENTS.md) — how this document is changed.
