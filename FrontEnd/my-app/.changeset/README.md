# Changesets (Frontend)

This folder collects per-PR change notes that the release script aggregates
into the top-level [`CHANGELOG.md`](../CHANGELOG.md).

## When to add a file here

You **must** add a file here (or edit `CHANGELOG.md` directly) when your PR
modifies any of the watched paths listed in
[`docs/TYPE_CHANGES_POLICY.md §3`](../docs/TYPE_CHANGES_POLICY.md#3-which-files-are-watched).

## How to add a file

1. Copy [`TEMPLATE.md`](./TEMPLATE.md) to a new file in this directory.
2. Name it `YYYY-MM-DD-<short-kebab-slug>.md`
   (e.g. `2026-05-27-rename-questsstatus-paused.md`). 3. Fill in the frontmatter and body. 4. Commit it as part of your PR.

   ## How they get released

   A maintainer running the release process (see
   [`docs/TYPE_CHANGES_POLICY.md §6`](../docs/TYPE_CHANGES_POLICY.md#6-release-process-maintainer-only))
   moves every file in this folder into the next release block in
   `CHANGELOG.md` and deletes the consumed files.

   ## Skipping

   For a strictly non-breaking PR that the CI guard flagged, do **not** add a
   dummy file. Instead, add the label `changelog-skip` to the PR or put
   `[changelog-skip]` in the PR title / commit message.
