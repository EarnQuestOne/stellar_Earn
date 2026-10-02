# Local Toolchain Setup Runbook

Step-by-step guide to set up the EarnQuest development environment.

## Prerequisites

- Linux, macOS, or Windows (WSL2 recommended)

## 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup target add wasm32-unknown-unknown
```

## 2. Install Soroban CLI

```bash
cargo install soroban-cli --locked
```

## 3. Verify Setup

```bash
rustup show          # confirm stable toolchain active
soroban --version    # confirm soroban-cli installed
cargo test           # run contract tests
```

## 4. Common Issues

| Problem                 | Fix                                               |
| ----------------------- | ------------------------------------------------- |
| `wasm32` target missing | `rustup target add wasm32-unknown-unknown`        |
| `soroban` not found     | Ensure `~/.cargo/bin` is in `$PATH`               |
| Build fails on Windows  | Use WSL2 or install `pkg-config` and `libssl-dev` |
