# Pull Request Size and Scope Guidelines

Pull requests should be small enough for reviewers to understand the intent,
validate the change, and identify regressions in one sitting. A pull request is
not a release container: unrelated cleanup, opportunistic refactoring, and
follow-up features belong in separate issues.

## Size targets

Use these targets as review signals rather than mechanical gates:

- **Small:** up to 200 changed lines and up to 5 files. Preferred for routine
  fixes and documentation.
- **Medium:** 201-500 changed lines or 6-10 files. Explain the reason for the
  size in the pull request description and identify the highest-risk areas.
- **Large:** more than 500 changed lines or 10 files. Split the work unless a
  single atomic change is required; document why it cannot be split.

Generated files, lockfiles, and vendored content should be identified
separately so their size does not hide the reviewable change.

## Scope rules

Each pull request should have one purpose, one primary owner, and a clear link
to its issue. Keep related edits together when separating them would make the
change unsafe or incomplete. Otherwise:

1. Separate behavior changes from formatting or renaming.
2. Separate independent modules or user workflows.
3. Land prerequisite refactors before the feature that depends on them.
4. Keep tests and documentation with the behavior they describe.

## Splitting a large change

When a change is too large, split it into independently reviewable pull
requests. Use a dependency order such as:

1. A mechanical or prerequisite change with no behavior change.
2. Small behavior increments that can be deployed or reverted independently.
3. Integration, migration, and documentation updates.

Each pull request must state its position in the sequence, its dependency on
earlier changes, and how it can be reviewed or reverted.

## Pull request description

The description should include the problem, approach, scope, validation, risk,
rollback plan, and closing references such as `Fixes #123`. Reviewers should be
able to determine what changed and what did not without reconstructing intent
from the diff.