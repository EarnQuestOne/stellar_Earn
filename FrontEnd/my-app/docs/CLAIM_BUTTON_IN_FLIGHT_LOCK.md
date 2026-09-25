# Guard against duplicate reward claims with an in-flight lock in ClaimButton (#2150)

## Overview

In `FrontEnd/my-app/components/rewards/ClaimButton.tsx`, users could rapidly click "Claim All Rewards" before an active transaction finished processing. This caused duplicate claim transactions to be dispatched, increasing RPC/API load and risking duplicate claim failures.

To address this, `ClaimButton` tracks an in-flight lock using `inFlightRef` and an `isPending` state variable.

## Key Changes

1. **In-Flight Lock Mechanism**:
   - `inFlightRef.current` synchronously locks when `handleClick` is fired, preventing concurrent click invocations.
   - `setIsPending(true)` sets the UI loading state.
   - `disabled` attribute on the `<button>` element is set to `true` while `status === 'pending' || isPending`.
   - `finally` block guarantees resetting `inFlightRef.current = false` and `setIsPending(false)` on both success and error/failure.

2. **Async Handler Support**:
   - `onClick` prop signature supports `() => void | Promise<void>`.

3. **Regression Tests**:
   - Added unit tests in `FrontEnd/my-app/components/rewards/ClaimButton.test.tsx` verifying single click execution, rejection of duplicate clicks during pending operations, lock release on promise completion/failure, disabled state, and accessible labels.

4. **Benchmark & Metrics**:
   - Added `FrontEnd/my-app/scripts/benchmarks/claim-button.bench.tsx`.
   - Results captured in `scripts/benchmarks/results/claim-button.latest.json`:
     - **10 rapid clicks**: Reduced duplicate claim dispatches from 10 to 1 (**90% load reduction**).
     - **100 rapid clicks**: Reduced duplicate claim dispatches from 100 to 1 (**99% load reduction**).
     - **1000 rapid clicks**: Reduced duplicate claim dispatches from 1000 to 1 (**99.9% load reduction**).
