# Rustdoc Standards

All public items in the EarnQuest contract must have inline rustdoc comments.

## Required Format

```rust
/// One-line summary ending with a period.
///
/// Optional longer description.
///
/// # Arguments
/// * `env` - The Soroban environment.
/// * `param` - Description of the parameter.
///
/// # Returns
/// Description of the return value.
///
/// # Errors
/// * `Error::Unauthorized` - If the caller lacks permission.
pub fn my_function(env: Env, param: Address) -> Result<(), Error> { ... }
```

## Rules

- Every `pub fn`, `pub struct`, and `pub enum` must have a `///` doc comment.
- One-line summaries must be complete sentences ending with a period.
- Use `# Arguments`, `# Returns`, and `# Errors` sections where applicable.
- Do not leave `TODO` or placeholder comments in public-facing docs.
