# Issue Lifecycle

Issues move through explicit states so ownership and the next action are visible
to contributors.

## States

| State | Meaning | Required next action |
| --- | --- | --- |
| Triage | The report is received, but scope, priority, or ownership is not confirmed. | A maintainer confirms that it is actionable and assigns an owner. |
| Ready | Scope and acceptance criteria are clear, and the issue is ready to be worked. | The assignee starts implementation or records why work is blocked. |
| In progress | An assignee is actively working on the issue. | Keep the issue updated with the branch or pull request. |
| Blocked | Work cannot proceed because an external decision, dependency, or missing detail is required. | Record the blocker and the condition needed to resume. |
| In review | A pull request addresses the issue and is awaiting review or requested changes. | Reviewers assess the change against the acceptance criteria. |
| Done | The change is merged and the acceptance criteria are satisfied. | Close the issue, referencing the merged pull request. |
| Closed | The issue is complete, superseded, or intentionally not being pursued. | Add a closing explanation when it is not marked Done. |

## Transitions

```text
Triage -> Ready -> In progress -> In review -> Done -> Closed
             ^          |              |
             |          v              v
             +------ Blocked <----------+
```

An issue may return from In review to In progress when changes are requested.
Blocked is not a substitute for inactivity: the blocker, owner, and next review
date must be recorded in a comment.

## Labels and ownership

- `status:triage`, `status:ready`, `status:in-progress`, `status:blocked`, and
  `status:review` represent the current workflow state.
- `priority:low`, `priority:medium`, and `priority:high` indicate urgency;
  priority does not replace an acceptance criterion.
- A single assignee owns the next action. Reviewers and supporting contributors
  may be mentioned without changing ownership.
- Use `Fixes #<issue-number>` when a pull request completely satisfies the
  issue. Use `Refs #<issue-number>` when the work is partial.

## Required issue record

Every actionable issue should include a problem statement, scope, acceptance
criteria, priority, and owner. Before closing, link the merged pull request or
explain why the issue was closed without implementation.