# Partial-Success Semantics for Batch Approval

## Overview

When `approve_submissions_batch` is called, individual submission failures should
not block payment for other valid submissions in the batch.

## Design

Each submission in the batch is processed independently. The response includes
a per-submission result indicating success or the failure reason.

### Response Shape

```rust
pub struct BatchApprovalResult {
    pub submission_id: u64,
    pub success: bool,
    pub error: Option<String>,
}
```

### Behaviour

- Successful approvals are committed even when others fail.
- Events are emitted only for successful approvals.
- The caller receives a `Vec<BatchApprovalResult>` with one entry per input.

## Affected Files

- `contracts/earn-quest/src/submission.rs`
- `contracts/earn-quest/src/lib.rs`
