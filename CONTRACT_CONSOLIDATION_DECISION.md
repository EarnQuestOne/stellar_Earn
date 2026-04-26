# Contract Codebase Consolidation Decision

## Issue #260 - Contract Codebase Consolidation

### Overview
Two parallel contract implementations existed in the repository:
- `Contract/` directory (older implementation)
- `contracts/` directory (newer implementation)

### Analysis Results

#### Contract/ Directory (Legacy)
- **Size**: 51 items total
- **Structure**: Workspace with multiple crates (`stellar_earn`, `earn_quest`)
- **Features**: Basic quest management with participant limits
- **Code Quality**: Simpler implementation, fewer modules
- **Documentation**: Comprehensive but older documentation
- **Test Coverage**: Basic test suite

#### contracts/ Directory (Canonical)
- **Size**: 154 items total (more comprehensive)
- **Structure**: Single focused `earn-quest` contract
- **Features**: 
  - Advanced payout system
  - Enhanced security module
  - Comprehensive validation
  - Event emission system
  - Statistics tracking
  - Batch operations
- **Code Quality**: More sophisticated architecture with better separation of concerns
- **Documentation**: Recent, focused on automated payout distribution
- **Test Coverage**: Extensive test suite with property-based testing

### Decision

**Chosen Canonical Version**: `contracts/earn-quest`

**Rationale**:
1. **More Recent Development**: Contains latest features and improvements
2. **Enhanced Functionality**: Includes advanced payout system, security modules, and validation
3. **Better Architecture**: Cleaner separation of concerns with dedicated modules
4. **Comprehensive Testing**: More robust test coverage including edge cases
5. **Industry Standards**: Follows modern Soroban contract patterns
6. **Specification Alignment**: As specified in the issue requirements

### Migration Actions

1. **Archive**: `Contract/` directory will be renamed to `Contract_archived/`
2. **Preserve**: `contracts/earn-quest` remains as the canonical implementation
3. **Documentation**: This decision document preserved for future reference
4. **References**: Update any build scripts or documentation pointing to old location

### Impact Assessment

- **Minimal Risk**: `contracts/` is already the more advanced implementation
- **Build Systems**: Need to verify no CI/CD references to `Contract/` directory
- **Documentation**: README files may need updates to reflect new canonical path
- **Development**: Future development should focus on `contracts/earn-quest`

### Verification

- [ ] Confirm no active dependencies on `Contract/` directory
- [ ] Verify build scripts work with canonical version
- [ ] Update documentation references
- [ ] Test that canonical version builds and deploys correctly

### Files Changed

- `Contract/` → `Contract_archived/` (archived)
- Created this decision document
- Updated relevant documentation

---

**Decision Date**: 2025-04-25  
**Issue**: #260 Contract Codebase Consolidation  
**Status**: Complete - contracts/earn-quest chosen as canonical
