# Fork and Re-licensing Policy

## Purpose

This policy states how the project may be forked and under what conditions its
license may change. It exists so that contributors and downstream users can rely
on a stable answer to two common questions: _may I fork this?_ and _can the
license change out from under me?_

## Forking

Forking is **allowed and encouraged**. The project is distributed under the
license in [`LICENSE`](../LICENSE) at the repository root, and that license
already grants the right to copy, modify, and redistribute the code.

What a fork must do:

- **Keep the license and copyright notices.** A fork must retain the `LICENSE`
  file and any copyright or attribution notices, as the license requires.
- **Not imply endorsement.** A fork must not present itself as the official
  project or imply that the maintainers endorse it. Use a distinct name and
  make clear in the README that it is an independent fork.
- **Not use project trademarks as its own identity.** The project name, logos,
  and marks are not granted by the license; a fork should use its own branding.
  See [LICENSING_POLICY.md](LICENSING_POLICY.md) for the IP rules that also
  apply to inbound contributions.

What a fork need not do:

- It does not require approval from the maintainers.
- It is not required to contribute changes back, though contributions are
  welcome and follow [CONTRIBUTING.md](../CONTRIBUTING.md).

The maintainers may decline to support, host, or promote a fork, and a fork does
not gain the right to use the project's CI, hosting, or release infrastructure.

## Re-licensing

Changing the project's license is a **high-impact, hard-to-reverse** decision
that affects every past contributor and every downstream user. It therefore
requires more than a normal pull request.

A change to the project license requires all of the following:

1. **A public proposal** — an RFC or grated issue describing the new license,
   the reason for the change, and the effect on existing users and forks.
2. **A compatibility review** — confirmation that the new license is compatible
   with the licenses of all third-party dependencies and bundled assets, and
   with the inbound contribution terms in
   [LICENSING_POLICY.md](LICENSING_POLICY.md).
3. **A contributor sign-off** — because the current license was granted by all
   past contributors, the change needs the agreement of every contributor whose
   work is still present, or a documented, legally reviewed mechanism (such as a
   Contributor License Agreement or a relicensing grant) that makes their
   permission unnecessary.
4. **A supermajority of maintainers** — approval by at least two thirds of the
   active maintainers listed in [MAINTAINERS.md](MAINTAINERS.md), recorded in
   the decision log under [decisions/README.md](decisions/README.md).

If any of these conditions cannot be met, the change does not proceed. A new
license takes effect only after it is committed, announced, and the old license
is noted as superseded in the decision log. Forks created under the previous
license keep the rights they were granted; re-licensing does not retroactively
remove them.

## Relationship to other policies

- Inbound contribution terms: [LICENSING_POLICY.md](LICENSING_POLICY.md).
- Decision-making and voting: [VOTING.md](VOTING.md) and
  [THRESHOLDS.md](THRESHOLDS.md).
- Archiving superseded documents: [ARCHIVE_POLICY.md](ARCHIVE_POLICY.md).
