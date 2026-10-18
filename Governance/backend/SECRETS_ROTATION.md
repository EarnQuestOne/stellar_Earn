# Backend Secrets Rotation Policy

This policy sets how often backend secrets are rotated and what happens when a secret is compromised.

- **Owner:** Backend maintainers (as listed in [MAINTAINERS.md](../MAINTAINERS.md))
- **Review cadence:** every 6 months
- **Status:** Active

## Scope

All secrets used by backend services: database credentials, JWT and session signing keys, API keys for third-party integrations, webhook signing secrets, and service-to-service tokens. Secrets must live in the deployment's secret store, never in the repository (see [SECRET_SCANNING.md](SECRET_SCANNING.md)).

## Rotation cadence

| Secret type | Maximum age |
| --- | --- |
| Database credentials | 90 days |
| JWT / session signing keys | 90 days |
| Third-party integration API keys | 180 days |
| Webhook signing secrets | 180 days |
| Service-to-service tokens | 90 days |

Rules:

- Rotation must not cause downtime. Where supported, run the old and new secret in parallel for a bounded overlap window, then revoke the old one.
- Rotate immediately when a maintainer or anyone with access to the secret leaves the project (see [OFFBOARDING.md](../OFFBOARDING.md)).
- Each secret has a named owner among the backend maintainers, who is responsible for its rotation on schedule.
- Rotations are recorded (secret name, date, performer) without recording the secret value.

## Compromised secrets

If a secret is leaked or suspected to be compromised:

1. **Revoke and rotate** the secret immediately, before any other cleanup. Deleting a commit is not sufficient.
2. **Assess impact** by reviewing audit logs for use of the secret since the earliest possible exposure.
3. **Report** to the maintainers; security-sensitive details follow the private disclosure path.
4. **Remove** the secret from code, logs and history where applicable.
5. **Follow up** within 5 working days with a record of what was exposed, how it was found, and what prevents a repeat.

Emergency rotations may bypass normal review under [HOTFIX_POLICY.md](../HOTFIX_POLICY.md) and must be reconciled afterwards.

## Review and updates

The backend maintainers review this document every 6 months. Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
