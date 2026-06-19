# TODO

- [ ] Fix cargo-deny configuration failure in `contracts/earn-quest/deny.toml` (updated `unmaintained` lint level).
- [ ] Re-run `cargo build` + `cargo test` in `contracts/earn-quest` to confirm CI unblock.
- [ ] If failures remain, inspect Rust compile error location around the reported line and fix syntax.
- [ ] After contract CI passes, address any frontend CI failures (next-intl / npm ci lockfile sync / policy checks).

