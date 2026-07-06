# JWT RS256 Key Rotation

This backend reads JWT signing and verification keys from environment variables.
Do not rely on checked-in PEM files in production.

## Environment variables

- `JWT_PRIVATE_KEY`: active private key used to sign new JWTs.
- `JWT_PUBLIC_KEY`: active public key (single-key setup).
- `JWT_PUBLIC_KEYS` (optional): comma-separated list of public keys accepted
  for verification during rotation.

Notes:

- Key values can be provided as single-line env vars using escaped newlines
  (`\\n`), and they are normalized at runtime.
- When `JWT_PUBLIC_KEYS` is set, the API accepts tokens signed by any key in
  that list.

## Zero-downtime rotation procedure

1. Generate a new RS256 key pair.
2. Update secrets:
   - Set `JWT_PRIVATE_KEY` to the **new private key**.
   - Set `JWT_PUBLIC_KEY` to the **new public key**.
   - Set `JWT_PUBLIC_KEYS` to `new_public_key,old_public_key`.
3. Deploy all backend instances.
   - New tokens are signed with the new private key.
   - Existing tokens signed by the old private key remain valid because the
     old public key is still accepted.
4. Wait until the old token maximum lifetime (for example,
   `JWT_ACCESS_TOKEN_EXPIRATION` + any refresh window you support) has passed.
5. Remove the old key from `JWT_PUBLIC_KEYS` and redeploy.

At the end of step 5, only the new key pair is active.
