# Soroban Coding Standards

## Patterns

| Pattern  | Guidance                                                                                  |
| -------- | ----------------------------------------------------------------------------------------- |
| Auth     | Always call `address.require_auth()` before mutating state.                               |
| Storage  | Prefer `instance` for global config, `persistent` for per-user data.                      |
| Errors   | Use `panic_with_error!` with typed error enums; never use `unwrap()` in production paths. |
| Events   | Emit events for every state-changing operation using `env.events().publish`.              |
| Overflow | Use `checked_add` / `checked_sub` / `saturating_*` for all arithmetic.                    |

## Anti-Patterns

| Anti-Pattern                         | Why to Avoid                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `unwrap()` on storage reads          | Panics with an opaque error; use `unwrap_or_else` with a typed error.         |
| Unbounded loops                      | Can exceed instruction limits; cap iteration with a max batch size.           |
| Storing large blobs                  | Increases ledger fees; store hashes or off-chain references instead.          |
| Re-entrancy via cross-contract calls | Use a re-entrancy guard (`nonreentrant_enter/exit`) around external calls.    |
| Skipping version checks on upgrade   | Always enforce `new_version > current_version` before applying WASM upgrades. |
