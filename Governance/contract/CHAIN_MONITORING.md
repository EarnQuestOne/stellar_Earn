# Contract On-Chain Monitoring and Alerting Policy

Problems on-chain need to be noticed quickly. This policy lists what is monitored, when alerts fire, and who responds.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months
- **Status:** Active

## Signals

Contract balances, large or unusual transfers, admin and parameter-change events, pause/unpause events, failed-transaction spikes, oracle update staleness, and storage or ledger-entry expiry (TTL) approaching.

## Thresholds

Each signal has a documented threshold, for example any admin or parameter-change event, a balance drop beyond a configured percentage within a window, or oracle data older than the allowed age. Thresholds are kept in the monitoring configuration.

## Routing

Critical alerts page the on-call contract maintainer and the security team; warnings go to the project channel. An alert has an acknowledgement target time and a runbook link.

## Response and review

Critical alerts follow EMERGENCY_PAUSE.md. Thresholds are tuned after every incident and reviewed every six months. Ownership: contract maintainers.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
