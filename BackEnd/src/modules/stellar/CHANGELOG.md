# stellar module changelog

All notable changes to the `stellar` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `sendPayment(recipientAddress, amount, asset?)` public method on `StellarService` for disbursing XLM (or other Stellar assets) via Horizon. Loads the configured admin keypair from `SOROBAN_SECRET_KEY` / `STELLAR_ADMIN_SECRET`, builds a payment operation with `TransactionBuilder` and `Operation.payment`, signs, and submits. Returns `{ transactionHash, ledger }`.
