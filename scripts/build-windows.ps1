<#
.SYNOPSIS
    Configures the Windows build environment for Stellar Soroban smart contract development.

.DESCRIPTION
    This script automates the installation of:
    1. Visual Studio Build Tools 2022 (Desktop Development with C++)
    2. Rustup (if not installed)
    3. The wasm32-unknown-unknown target
    4. Runs `cargo build` to verify the setup.

.EXAMPLE
    .\build-windows.ps1
#>

param (
    [switch]$SkipVSInstall = $false,
    [switch]$SkipRustInstall = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Setting up Windows Environment for Stellar Contracts " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Check/Install Visual Studio C++ Build Tools
if (-not $SkipVSInstall) {
    Write-Host "`n[1/4] Checking Visual Studio C++ Build Tools..." -ForegroundColor Cyan
    
    # Path to vswhere
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    $vsInstalled = $false
    
    if (Test-Path $vswhere) {
        $components = & $vswhere -latest -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($components) {
            $vsInstalled = $true
        }
    }

    if (-not $vsInstalled) {
        Write-Host "Visual Studio C++ Build Tools not found. Downloading installer..." -ForegroundColor Yellow
        $installerPath = "$env:TEMP\vs_buildtools.exe"
        Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vs_buildtools.exe" -OutFile $installerPath
        
        Write-Host "Installing Visual Studio Build Tools 2022 with C++ workload (This may take a while)..." -ForegroundColor Yellow
        $arguments = "--quiet --wait --norestart --nocache --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        
        $process = Start-Process -FilePath $installerPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 3010) {
            Write-Host "Visual Studio Build Tools installed successfully." -ForegroundColor Green
            if ($process.ExitCode -eq 3010) {
                Write-Host "NOTE: A restart may be required to complete the installation." -ForegroundColor Yellow
            }
        } else {
            Write-Host "Visual Studio Build Tools installation failed with exit code $($process.ExitCode)." -ForegroundColor Red
            Exit $process.ExitCode
        }
    } else {
        Write-Host "Visual Studio C++ Build Tools are already installed." -ForegroundColor Green
    }
} else {
    Write-Host "`n[1/4] Skipping Visual Studio C++ Build Tools check due to -SkipVSInstall." -ForegroundColor DarkGray
}

# 2. Check/Install Rust
if (-not $SkipRustInstall) {
    Write-Host "`n[2/4] Checking Rust installation..." -ForegroundColor Cyan
    if (Get-Command cargo -ErrorAction SilentlyContinue) {
        Write-Host "Rust is already installed." -ForegroundColor Green
    } else {
        Write-Host "Rust not found. Downloading rustup-init..." -ForegroundColor Yellow
        $rustupPath = "$env:TEMP\rustup-init.exe"
        Invoke-WebRequest -Uri "https://win.rustup.rs" -OutFile $rustupPath
        
        Write-Host "Installing Rust (default MSVC toolchain)..." -ForegroundColor Yellow
        Start-Process -FilePath $rustupPath -ArgumentList "-y" -Wait -NoNewWindow
        
        # Add cargo to current session path
        $env:Path += ";$env:USERPROFILE\.cargo\bin"
        Write-Host "Rust installed successfully." -ForegroundColor Green
    }
} else {
    Write-Host "`n[2/4] Skipping Rust check due to -SkipRustInstall." -ForegroundColor DarkGray
}

# 3. Configure WASM Target
Write-Host "`n[3/4] Configuring Rust for wasm32-unknown-unknown target..." -ForegroundColor Cyan
try {
    # Check if cargo is in path, if not we might need to manually call it
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
        throw "Cargo is not in the system PATH. Please restart your PowerShell and run this script again."
    }
    
    $rustupVersion = (rustup --version) *>&1
    Write-Host "Rustup version: $rustupVersion" -ForegroundColor DarkGray
    
    rustup target add wasm32-unknown-unknown
    Write-Host "Added wasm32-unknown-unknown target." -ForegroundColor Green
} catch {
    Write-Host "Failed to add WebAssembly target: $_" -ForegroundColor Red
    Exit 1
}

# 4. Test Build
Write-Host "`n[4/4] Testing cargo build..." -ForegroundColor Cyan
$contractDir = Join-Path -Path $PSScriptRoot -ChildPath "..\Contract"

if (-not (Test-Path $contractDir)) {
    Write-Host "Contract directory not found at $contractDir. Check project structure." -ForegroundColor Red
    Exit 1
}

Push-Location $contractDir
try {
    Write-Host "Running cargo build in $contractDir..." -ForegroundColor DarkGray
    cargo build --workspace --target wasm32-unknown-unknown --release
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=======================================================" -ForegroundColor Green
        Write-Host " Build successful! Windows environment is fully ready. " -ForegroundColor Green
        Write-Host "=======================================================" -ForegroundColor Green
    } else {
        Write-Host "`nBuild failed with exit code $LASTEXITCODE. Please check the error logs above." -ForegroundColor Red
        Exit $LASTEXITCODE
    }
} catch {
    Write-Host "An error occurred during build: $_" -ForegroundColor Red
    Exit 1
} finally {
    Pop-Location
}
