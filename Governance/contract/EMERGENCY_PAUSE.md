# Contract Emergency Pause and Circuit-Breaker Policy

A pause stops damage while a problem is understood, but it also stops legitimate users. This policy limits who can pause, when, and how service is restored.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months and after any pause
- **Status:** Active

## Who can pause

A small, named set of pause holders listed in the maintainers roster. Any one holder may pause; unpausing needs two approvals.

## Conditions

Pause only for an active or credible threat to funds or integrity: a confirmed exploit, an oracle compromise, a key compromise, or critical inconsistent accounting. Convenience or routine maintenance is not a reason.

## During a pause

State what is paused, announce in the project channel, preserve evidence, and start the incident process in EMERGENCY_POWERS.md. Withdrawals of user funds stay available where it is safe to do so.

## Restoring service

Unpause only after the cause is understood and fixed or mitigated, verified as in POST_DEPLOY_VERIFY.md, and approved by two holders.

## Review

Each pause gets a postmortem using templates/POSTMORTEM_TEMPLATE.md. Owned by the contract maintainers and security team.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
