# Triager Role

## Purpose

This document describes the triager role: what triagers do, the labels and
milestones they may manage, and how the role relates to reviewers and
maintainers. It complements [../TRIAGE_POLICY.md](../TRIAGE_POLICY.md), which
defines the triage steps themselves, and [../ROLES.md](../ROLES.md), which
places the role in the project-wide matrix.

## What a triager is

A triager is a contributor trusted to keep the issue and pull-request queue
healthy: making sure reports are classified, prioritized, deduplicated, and
routed to the right people so that maintainers spend their time deciding rather
than sorting. A triager is the front door of the project, so courtesy and
consistency matter as much as judgement.

Maintainers triage by default; the triager role exists so that this work can be
shared (and so that contributors can grow into it) without granting merge
authority.

## Duties

Following [../TRIAGE_POLICY.md](../TRIAGE_POLICY.md), a triager:

- **Classifies** new issues — bug, feature, documentation, question, or
  governance — and applies the corresponding type label.
- **Prioritizes** bugs by severity and impact and labels accordingly.
- **Deduplicates** — links or closes duplicates against the original report.
- **Requests missing information** — reproduction steps, version, environment —
  and marks reports that are awaiting the reporter's response.
- **Labels difficulty and scope**, including `good-first-issue`, per
  [../MENTORSHIP.md](../MENTORSHIP.md).
- **Routes** each item to the relevant area owner and, where the project uses
  it, to a milestone.
- **Keeps the queue current** — follows up on stale reports, unassigns abandoned
  work, and asks for status rather than letting items rot.
- **Flags security reports immediately** to the security response team
  ([SECURITY_TEAM.md](SECURITY_TEAM.md)) instead of discussing them publicly.

## Permissions

A triager may:

- **apply and remove triage labels** (type, priority, difficulty, `needs-info`,
  duplicate, and similar);
- **assign and unassign issues and milestones** to route work;
- **close duplicates**, spam, or off-topic reports, with a short explanation;
- **edit issue titles and metadata** to make them searchable; and
- **escalate** an item to a maintainer or the security team when it is outside
  their remit.

A triager may **not**:

- merge pull requests;
- approve changes for the purposes of the review requirement; or
- resolve a security report on their own — those stay with the security
  response team.

Triage authority applies to issue and pull-request *metadata*, not to the code
or the decision about whether a change is accepted.

## Relationship to other roles

A triager works closely with maintainers, who own the final decisions, and with
reviewers, who own technical review. Overlap is expected: a maintainer is always
allowed to triage, and a triager who grows into technical review can be
nominated as a [reviewer](REVIEWER.md). Nothing about the triager role is
required to become a reviewer, and nothing about it forecloses that path.

## Expectations

- **Responsiveness.** New issues are triaged on the cadence set in
  [../TRIAGE_POLICY.md](../TRIAGE_POLICY.md) — at least weekly, and promptly for
  anything that looks like a security concern or a production defect.
- **Consistency.** Use the documented label set; do not invent labels ad hoc.
- **Tone.** Triage sets the project's first impression. Apply the
  [Code of Conduct](../CODE_OF_CONDUCT.md) and
  [inclusive language guideline](../INCLUSIVE_LANGUAGE.md) in every reply.
- **Handover.** Record enough context (labels, links, reproduction notes) that
  anyone picking up the item can act without re-reading the whole thread.
