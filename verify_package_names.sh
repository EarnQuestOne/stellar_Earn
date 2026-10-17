#!/bin/bash

echo "🔍 Verifying Package Name Standardization"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "contracts/earn-quest/Cargo.toml" ]; then
    echo "❌ Error: contracts/earn-quest/Cargo.toml not found. Please run from stellar_Earn root directory."
    exit 1
fi

echo "📦 Checking package names in Cargo.toml files..."

# Check contracts/earn-quest/Cargo.toml
echo "🔍 Checking contracts/earn-quest/Cargo.toml..."
if grep -q 'name = "earn_quest"' contracts/earn-quest/Cargo.toml; then
    echo "✅ contracts/earn-quest/Cargo.toml: name = 'earn_quest'"
else
    echo "❌ contracts/earn-quest/Cargo.toml: Incorrect package name"
    grep 'name = ' contracts/earn-quest/Cargo.toml
    exit 1
fi

echo ""
echo "🧪 Testing build with standardized naming..."

# Test package build
echo "🔨 Building earn_quest package..."
cd contracts/earn-quest
if cargo check; then
    echo "✅ earn_quest package check successful"
else
    echo "❌ earn_quest package check failed"
    exit 1
fi

# Test WASM build
echo "🔨 Building WASM target..."
if cargo build --release --target wasm32-unknown-unknown; then
    echo "✅ WASM build successful"
else
    echo "❌ WASM build failed"
    exit 1
fi

cd ../..

echo ""
echo "📋 Standardization Summary:"
echo "   ✅ Package name standardized to 'earn_quest'"
echo "   ✅ Contract builds successfully"
echo "   ✅ WASM target builds successfully"

echo ""
echo "🎉 Package name standardization complete!"

# Show final package name
echo ""
echo "📊 Final Package Name:"
echo "   contracts/earn-quest/Cargo.toml: $(grep 'name = ' contracts/earn-quest/Cargo.toml | cut -d'"' -f2)"
