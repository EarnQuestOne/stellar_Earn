# Windows Setup Guide for Stellar Soroban Smart Contracts

This guide provides instructions to successfully set up a Windows development environment for compiling and testing Stellar Soroban smart contracts.

By default, Rust uses the MSVC (Microsoft Visual C++) toolchain on Windows, requiring the Visual Studio C++ Build Tools (specifically `link.exe`). Without these, you may encounter linking errors during `cargo build` and test failures.

## Option 1: Automated Script (Recommended)

We provide an automated setup script that will check your environment and download the necessary tools for you.

1. Open **PowerShell** as an Administrator.
2. Run the provided script from the project root:
   ```powershell
   cd .\scripts
   .\build-windows.ps1
   ```

The script will automatically:
- Download and install the **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload (installed in quiet mode).
- Install **Rust** via `rustup` (if not already installed).
- Add the required **`wasm32-unknown-unknown`** target.
- Test the workspace by successfully running a test compilation of the contracts.

## Option 2: Manual Installation

If you prefer to configure your environment manually, follow these steps:

### 1. Install Visual Studio C++ Build Tools

1. Download the [Visual Studio Build Tools 2022](https://aka.ms/vs/17/release/vs_buildtools.exe).
2. Run the installer.
3. In the installer, select the **Desktop development with C++** workload.
4. Ensure the following optional components are selected (they are usually included by default):
    - MSVC v143 - VS 2022 C++ x64/x86 build tools
    - Windows 10/11 SDK
5. Click **Install**.

### 2. Install Rust and Cargo

Download and run `rustup-init.exe` from [rustup.rs](https://rustup.rs/). Proceed with the system defaults (which should pick up the MSVC toolchain you just installed).

### 3. Add the WebAssembly Target

To build contracts to bytecode for Soroban, you must install the `wasm32-unknown-unknown` target. Open a terminal and run:

```bash
rustup target add wasm32-unknown-unknown
```

### 4. Verify the Build

Open a native Windows terminal (e.g. Command Prompt or PowerShell) and test your installation:

```bash
cd Contract
cargo build --workspace --target wasm32-unknown-unknown --release
```

If the compilation succeeds, your Windows native setup is complete!

---

## Alternative: Using WSL2 (Windows Subsystem for Linux)

If you strictly prefer a Unix-like experience on Windows, you can utilize WSL2.

### 1. Install WSL2
Open PowerShell as Administrator and execute:
```powershell
wsl --install
```
*You may need to restart your computer.*

### 2. Configure Ubuntu (or your preferred distro)
Open the newly installed Ubuntu environment and update it along with setting up C++ build essentials:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl build-essential git -y
```

### 3. Install Rust inside WSL2
Install `rustup`:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```
Then add the WASM target:
```bash
rustup target add wasm32-unknown-unknown
```

### 4. Build Contracts
Navigate to your Windows project directory seamlessly via the `/mnt/c/` path (or open your repo directly if cloned within WSL):
```bash
cd /mnt/c/Users/YourUsername/Desktop/stellar_Earn/Contract
cargo build --workspace --target wasm32-unknown-unknown --release
```
