# Licensing and IP Contribution Policy

How contributions are licensed and how intellectual property is handled has
not been documented. This policy defines the inbound license for
contributions and the rules for including third-party code.

## Inbound license

By submitting a pull request, issue, or other contribution to this
repository, a contributor licenses their contribution under the same license
as the project (see `LICENSE` at the repository root). No separate
Contributor License Agreement is required unless a future policy explicitly
introduces one; if one is introduced, it supersedes this section and is
documented in `Governance/CLA_POLICY.md` (or equivalent) with a transition
plan for existing contributors.

A contributor confirms, by submitting the contribution, that:

- They have the right to license the contribution under the project's
  license (e.g. it is their own original work, or they hold the necessary
  rights to it).
- The contribution does not knowingly infringe a third party's copyright,
  patent, or other intellectual property rights.

## Third-party code inclusion

Code, assets, or dependencies not originally authored by the contributor
may only be included when:

- The source's license is compatible with this project's license, and the
  license text and attribution are preserved (in the file itself, a
  `NOTICE`/`THIRD_PARTY_LICENSES` file, or the dependency manifest, as
  appropriate for the ecosystem).
- The inclusion is disclosed in the pull request description, naming the
  source and its license.
- Copy-pasted snippets from Stack Overflow, blog posts, or similar sources
  follow the same disclosure and compatibility rule — "I found it online" is
  not an exemption from checking the license.

A maintainer may request removal or replacement of third-party code whose
provenance or license cannot be confirmed.

## Maintainer review responsibility

Reviewers check that a pull request's stated third-party sources (if any)
are disclosed and license-compatible before merging. This is a lightweight
check, not a full IP audit — when in doubt, ask the contributor for the
source and license before merging rather than after.
