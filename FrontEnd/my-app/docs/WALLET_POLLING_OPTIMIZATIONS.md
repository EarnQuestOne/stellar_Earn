# 👛 Wallet UI Polling Optimizations

To reduce Soroban RPC overhead and minimize component re-renders, balance and trustline queries adhere to the following execution constraints:

1. **Debounced Invocation**: Interactive state updates and wallet events trigger a debounced fetch (`500ms` window) rather than immediate RPC dispatches.
2. **Page Visibility State Aware**: Polling automatically suspends when `document.hidden === true` and resumes with a single debounced fetch upon tab reactivation.
3. **Timer Cleanup**: All interval timers and pending timeout refs are cleared on component unmount to prevent leaks.