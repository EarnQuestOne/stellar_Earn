# Contract Versioning Strategy

## Version Format

Contracts use a monotonically increasing integer version stored in instance storage.

```
current_version: u32  (e.g. 1, 2, 3 ...)
```

## Upgrade Rules

1. New version must be strictly greater than the current version.
2. Downgrade is forbidden — the upgrade function must panic on `new_version <= current`.
3. Every upgrade must be authorised by the designated upgrade authority address.

## Migration Steps

1. Deploy new WASM and call `authorize_upgrade(new_wasm_hash, new_version)`.
2. Call `handle_upgrade()` to run any storage migration logic.
3. Verify `get_version()` returns the expected new version.
4. Update `CHANGELOG.md` under `## [Unreleased]` with the new version entry.

## Breaking Changes

- Any change to storage key layout, public function signatures, or event schemas is a breaking change.
- Breaking changes require a `### Breaking Changes` entry in `CHANGELOG.md` per the Changelog Discipline Policy.
