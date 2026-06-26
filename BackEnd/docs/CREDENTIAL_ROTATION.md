# Credential Rotation Playbook

## Overview

This document defines the procedure for rotating credentials used by the StellarEarn backend.

## Credentials in Scope

| Credential | Location | Rotation Frequency |
|---|---|---|
| `JWT_SECRET` | `.env` / Secrets Manager | 90 days |
| `DATABASE_URL` password | `.env` / Secrets Manager | 180 days |
| GitHub OAuth secret | GitHub App settings | 180 days |
| Stellar platform secret key | Secrets Manager | As needed |

## Rotation Steps

### JWT Secret

1. Generate a new secret: `openssl rand -base64 48`
2. Update the secret in your secrets manager.
3. Restart the backend service.
4. Existing refresh tokens will be invalidated — users must re-login.

### Database Password

1. Generate a new password via your DB provider.
2. Update `DATABASE_URL` in secrets manager.
3. Restart the backend service.

### Stellar Platform Key

1. Generate a new keypair using `soroban keys generate`.
2. Fund the new account.
3. Update `STELLAR_PLATFORM_SECRET` in secrets manager.
4. Restart and verify connectivity.

## Automation

Create a GitHub Actions scheduled workflow (`.github/workflows/credential-rotation-reminder.yml`)
to open a reminder issue every 90 days.
