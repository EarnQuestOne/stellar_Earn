# StellarEarn Smart Contract (Soroban)

Rust + Soroban smart contract workspace for **stellar_Earn**.

## Quick Start (local)

```bash
cd Contract

# Build (native)
cargo build --workspace --release

# Tests
cargo test --workspace

# Quality gates (same as CI)
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings

# Build WASM (for deploy)
cargo build --workspace --target wasm32-unknown-unknown --release
```

## What’s in here

- **`stellar_earn`**: the Soroban contract crate (currently scaffolded with a minimal example).
- **Pinned toolchain**: `rust-toolchain.toml` ensures consistent `rustfmt`, `clippy`, and WASM target.
- **CI quality gates**: build + test + fmt + clippy + wasm build run on PRs/pushes.

## Structure

```
Contract/
├── Cargo.toml              # Workspace manifest + release profile + lint gates
├── rust-toolchain.toml     # Rust toolchain/components/targets
├── deny.toml               # Optional supply-chain checks (cargo-deny)
├── stellar_earn/           # Contract crate
│   ├── Cargo.toml
│   ├── Makefile
│   └── src/
│       ├── lib.rs
│       └── test.rs
└── README.md
```

## Prerequisites

- **Rust (stable)** via [rustup](https://rustup.rs/)
  - **Windows Users**: You will need the Visual Studio C++ Build Tools (`link.exe`). See our [Windows Setup Guide](../docs/WINDOWS_SETUP_GUIDE.md) for full instructions or run `..\scripts\build-windows.ps1` to configure your environment automatically. WSL2 is also a supported alternative.
- **WASM target**:

```bash
rustup target add wasm32-unknown-unknown
```

- **Stellar CLI** (recommended for build/deploy):

```bash
cargo install --locked stellar-cli --features opt
```

## Makefile (optional)

```bash
cd Contract/stellar_earn
make build
make wasm
make test
make fmt
make clippy
```

## Deploy (Testnet)

This repo documents deployment via CLI, but **does not store secrets**.

```bash
export STELLAR_NETWORK=testnet
export STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
export STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
export DEPLOYER_SECRET_KEY=<your-secret-key>

cd Contract

# Build optimized WASM (Stellar CLI produces optimized output)
stellar contract build --workspace

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_earn.optimized.wasm \
  --network testnet \
  --source deployer
```

## Notes

- The long "contract architecture" spec will live alongside real contract code as `stellar_earn` grows; this README stays **scaffold + commands focused**.
- If you want stricter supply-chain checks, run `cargo deny check` from `Contract/` (requires `cargo-deny`).
