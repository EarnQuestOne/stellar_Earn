#!/bin/bash

echo "🔍 Verifying Package Name Standardization"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "Contract/Cargo.toml" ]; then
    echo "❌ Error: Contract/Cargo.toml not found. Please run from stellar_Earn root directory."
    exit 1
fi

echo "📦 Checking package names in Cargo.toml files..."

# Check Contract/earn-quest/Cargo.toml
echo "🔍 Checking Contract/earn-quest/Cargo.toml..."
if grep -q 'name = "earn_quest"' Contract/earn-quest/Cargo.toml; then
    echo "✅ Contract/earn-quest/Cargo.toml: name = 'earn_quest'"
else
    echo "❌ Contract/earn-quest/Cargo.toml: Incorrect package name"
    grep 'name = ' Contract/earn-quest/Cargo.toml
    exit 1
fi

# Check contracts/earn-quest/Cargo.toml
echo "🔍 Checking contracts/earn-quest/Cargo.toml..."
if grep -q 'name = "earn_quest"' contracts/earn-quest/Cargo.toml; then
    echo "✅ contracts/earn-quest/Cargo.toml: name = 'earn_quest'"
else
    echo "❌ contracts/earn-quest/Cargo.toml: Incorrect package name"
    grep 'name = ' contracts/earn-quest/Cargo.toml
    exit 1
fi

# Check Contract/Cargo.toml workspace members
echo "🔍 Checking Contract/Cargo.toml workspace members..."
if grep -q '"earn_quest"' Contract/Cargo.toml; then
    echo "✅ Contract/Cargo.toml: workspace includes 'earn_quest'"
else
    echo "❌ Contract/Cargo.toml: Workspace member reference incorrect"
    grep 'members = ' Contract/Cargo.toml -A 5
    exit 1
fi

echo ""
echo "🧪 Testing build with standardized naming..."

# Test workspace build
echo "🔨 Building Contract workspace..."
cd Contract
if cargo check --workspace; then
    echo "✅ Contract workspace build successful"
else
    echo "❌ Contract workspace build failed"
    exit 1
fi

# Test individual package builds
echo "🔨 Building earn_quest package..."
if cargo check -p earn_quest; then
    echo "✅ earn_quest package build successful"
else
    echo "❌ earn_quest package build failed"
    exit 1
fi

# Test WASM build
echo "🔨 Building WASM target..."
if cargo build --workspace --release --target wasm32-unknown-unknown; then
    echo "✅ WASM build successful"
else
    echo "❌ WASM build failed"
    exit 1
fi

# Test running tests
echo "🧪 Running tests..."
if cargo test --workspace --lib; then
    echo "✅ Tests passed successfully"
else
    echo "❌ Tests failed"
    exit 1
fi

cd ..

echo ""
echo "📋 Standardization Summary:"
echo "   ✅ All package names standardized to 'earn_quest'"
echo "   ✅ Workspace configuration updated"
echo "   ✅ Contract workspace builds successfully"
echo "   ✅ Individual package builds successfully"
echo "   ✅ WASM target builds successfully"
echo "   ✅ All tests pass"

echo ""
echo "🎉 Package name standardization complete!"

# Show final package names
echo ""
echo "📊 Final Package Names:"
echo "   Contract/earn-quest/Cargo.toml: $(grep 'name = ' Contract/earn-quest/Cargo.toml | cut -d'"' -f2)"
echo "   contracts/earn-quest/Cargo.toml: $(grep 'name = ' contracts/earn-quest/Cargo.toml | cut -d'"' -f2)"
echo "   Contract/stellar_earn/Cargo.toml: $(grep 'name = ' Contract/stellar_earn/Cargo.toml | cut -d'"' -f2)"
