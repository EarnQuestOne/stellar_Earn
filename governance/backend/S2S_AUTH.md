# Backend Service-to-Service Authentication Policy

## Overview
This document defines the official Service-to-Service (S2S) authentication and authorization policy for backend microservices, background workers, and Stellar blockchain indexing daemons in **EarnQuestOne/stellar_Earn**. Securing internal service communication prevents lateral movement and unauthorized inter-service RPC executions.

---

## 1. Internal Authentication Architecture
- **Mutual TLS (mTLS)**: All inter-service network traffic across internal networks or service meshes must be encrypted in transit using mTLS with strict X.509 certificate validation.
- **Service Identity Tokens (JWT)**:
  - Calling services must authenticate HTTP/gRPC requests using short-lived (maximum 15-minute validity) JSON Web Tokens (JWTs).
  - Tokens must be signed asynchronously using RS256/EdDSA private keys held by the issuing identity service and verified via public key endpoint discovery (JWKS).
  - Claims must include `iss` (calling service ID), `aud` (receiving service ID), and granular `scopes` declaring authorized operations.

---

## 2. Token Scope & Least Privilege
- **Scoped Permissions**: Receiving services must validate that incoming S2S tokens possess the exact scope required for the requested endpoint (e.g., `scope: "ledger:read"`).
- **No Pass-Through User Credentials**: S2S calls MUST NOT forward raw user sessions or tokens directly; user identity context must be explicitly passed in dedicated header fields (`X-User-Context`) alongside a valid S2S identity token.

---

## 3. Secret & Certificate Rotation
- **Certificate Renewal**: Internal mTLS certificates must be automatically rotated via service mesh / Vault integrations at least every 30 days.
- **JWKS Signing Key Rotation**: Keypairs used for signing S2S JWTs must undergo automated rotation every 90 days without requiring service restarts.

---

## 4. Ownership & Review Cadence
- **Primary Owner**: Platform Infrastructure & Security Engineering Team.
- **Review Cadence**: Audited semi-annually or upon significant topology changes to internal microservices.