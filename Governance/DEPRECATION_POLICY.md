# Deprecation and Breaking-Change Policy

This document defines how StellarEarn deprecates existing functionality,
communicates deprecations to consumers, and eventually removes or changes
deprecated items in a breaking way.

## Principles

- Consumers deserve advance notice before behaviour they depend on is removed
  or changed incompatibly.
- Deprecation is not removal: a deprecated item continues to work for the
  duration of its notice period.
- Migration paths must be documented at the time of deprecation, not at the
  time of removal.
- Breaking changes are batched into MAJOR releases wherever practical to reduce
  migration burden.

## What requires a deprecation notice

A deprecation notice is required before any change that:

- Removes a public API endpoint, contract function, event, or error type.
- Changes the meaning, type, or encoding of an existing parameter or return
  value in a way that breaks existing callers.
- Removes or renames a configuration key, environment variable, or CLI flag.
- Changes default behaviour in a way that callers must explicitly opt into to
  preserve existing semantics.
- Removes a supported platform, runtime version, or integration.

Internal implementation details that are not part of the public API surface do
not require a deprecation notice, but maintainers should use judgment when a
change affects common usage patterns.

## Deprecation notice requirements

When an item is deprecated, the following must be provided in the same pull
request that adds the deprecation:

1. **Code annotation** – mark the item with the language's standard deprecation
   mechanism (e.g. `@deprecated` JSDoc tag, `#[deprecated]` attribute) and
   include a short message naming the replacement or explaining the rationale.
2. **Changelog entry** – add a `Deprecated` section to `CHANGELOG.md` for the
   release that introduces the deprecation, listing the item and the planned
   removal version or date.
3. **Migration guide** – document what consumers must do to migrate in the
   changelog entry or a linked document. The guide must be available before or
   at the time of the deprecating release, not only at removal.
4. **Removal target** – state the earliest MAJOR release or calendar date at
   which the item may be removed. This is a minimum notice period, not a
   guaranteed removal date.

## Notice periods

| Item type | Minimum notice period |
|-----------|-----------------------|
| Public API or contract entrypoint | Two MAJOR releases or six months, whichever is longer. |
| Configuration key or environment variable | One MAJOR release or three months, whichever is longer. |
| Supported platform or runtime version | One MAJOR release or three months, whichever is longer. |
| Internal or experimental API (clearly labelled as such) | One MINOR release or 30 days, whichever is longer. |

Notice periods begin from the date of the first release that includes the
deprecation annotation and changelog entry.

## Breaking changes

A breaking change may only land in a MAJOR version increment (see
[VERSIONING.md](VERSIONING.md)). Before a breaking change is merged:

1. The deprecation notice period for the affected item must have elapsed.
2. The migration guide must be up to date and linked from the release PR.
3. The release manager confirms the change is included in the MAJOR release
   changelog.

Emergency breaking changes (e.g. critical security fixes with no
backward-compatible mitigation) may bypass the notice period with explicit TSC
approval. The rationale and the shortened timeline must be documented in the
release notes.

## Removal process

When the notice period has elapsed and a MAJOR release is being prepared:

1. Remove the deprecated item and its annotation.
2. Add a `Removed` section to `CHANGELOG.md` for the MAJOR release.
3. Verify that the migration guide is still accurate and link it from the
   `Removed` entry.
4. Update any internal usage of the removed item.

## Experimental and unstable APIs

Items explicitly marked as experimental or unstable (e.g. with an `@experimental`
annotation or a documented stability label) may be changed or removed in MINOR
or PATCH releases without a formal deprecation notice, provided they are clearly
identified as unstable in the public documentation. Experimental items must not
be used in production integrations without accepting this risk.

## Related documents

- [VERSIONING.md](VERSIONING.md) – semantic versioning rules and MAJOR/MINOR/PATCH classification.
- [RELEASE_POLICY.md](RELEASE_POLICY.md) – release approval process and changelog requirements.
- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) – emergency change controls.
