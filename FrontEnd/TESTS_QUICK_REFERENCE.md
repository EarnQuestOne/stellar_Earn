# FE-038: Config Error Panel Tests - Quick Reference

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure dependencies are installed
pnpm install

# Ensure dev server is running (for E2E tests)
pnpm dev
```

## 📋 Test Files

| File                         | Type | Location                | Purpose                    |
| ---------------------------- | ---- | ----------------------- | -------------------------- |
| `config-error-panel.spec.ts` | E2E  | `tests/e2e/`            | Visual & interaction tests |
| `EnvValidator.test.tsx`      | Unit | `components/providers/` | Component logic tests      |
| `page.tsx`                   | Demo | `app/error-panel-demo/` | Test rendering target      |

## ▶️ Running Tests

### Quick Commands

```bash
# Run all tests
pnpm run test:all

# Unit tests only
pnpm test

# E2E tests only
pnpm playwright test

# E2E tests with UI
pnpm playwright test --ui

# Watch mode (unit tests)
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Specific Test Files

```bash
# EnvValidator unit tests
pnpm test EnvValidator

# Config error panel E2E tests
pnpm playwright test config-error-panel

# Only visual comparison tests
pnpm playwright test --grep "Visual Comparison"

# Only accessibility tests
pnpm playwright test --grep "accessibility"
```

### Update Snapshots

```bash
# Update all E2E snapshots
pnpm playwright test --update-snapshots

# Update specific file
pnpm playwright test config-error-panel --update-snapshots
```

## 🔍 Test Coverage

### E2E Tests (13 tests)

- ✅ Visual hierarchy and layout
- ✅ Icon styling and visibility
- ✅ Heading styling and text
- ✅ Error message formatting
- ✅ Help section content
- ✅ Example configuration display
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Color contrast accessibility
- ✅ Interactive elements
- ✅ Content centering
- ✅ Multiple error display
- ✅ Loading state transitions
- ✅ ARIA attributes

### Unit Tests (25+ tests)

- ✅ Valid environment rendering
- ✅ Loading state display
- ✅ Error panel structure
- ✅ Error message content
- ✅ Help section formatting
- ✅ Code block rendering
- ✅ Accessibility (ARIA, semantics)
- ✅ Error handling
- ✅ Visual layout

## 📸 Visual Snapshots

Stored in: `tests/e2e/config-error-panel/` (auto-created)

```
config-error-panel/
├── error-panel-full.png           # Complete error panel
├── error-icon.png                 # Error icon close-up
├── error-message-box.png          # Error message container
├── example-env-block.png          # Example config block
├── error-panel-desktop.png        # Desktop viewport
├── error-panel-tablet.png         # Tablet viewport
└── error-panel-mobile.png         # Mobile viewport
```

## 🔧 Development Workflow

### Making Changes

1. **Update component** → Run tests to detect changes
2. **View failures** → Review snapshot diffs
3. **Update snapshots** → If changes are intentional
4. **Re-run tests** → Verify all pass

### Example Workflow

```bash
# Make changes to EnvValidator.tsx
vim components/providers/EnvValidator.tsx

# Run tests
pnpm test EnvValidator                    # Unit tests
pnpm playwright test config-error-panel   # E2E tests

# View failures (if any)
# For E2E: Use HTML report
pnpm playwright test --ui

# Update snapshots if intentional
pnpm playwright test --update-snapshots

# Verify all pass
pnpm run test:all
```

## 📊 Reports

### HTML Report (E2E)

```bash
pnpm playwright test
open playwright-report/index.html
```

### Coverage Report (Unit)

```bash
pnpm test --coverage
open coverage/index.html
```

### Test Results

```bash
# Verbose output
pnpm test --reporter=verbose
pnpm playwright test --reporter=list
```

## 🚨 Common Issues & Solutions

| Issue                | Command                                   | Solution                     |
| -------------------- | ----------------------------------------- | ---------------------------- |
| Route not found      | `pnpm playwright test`                    | Ensure dev server is running |
| Snapshot mismatch    | `pnpm playwright test --update-snapshots` | Update baseline images       |
| Slow tests           | `pnpm test --timeout=10000`               | Increase timeout             |
| Missing dependencies | `pnpm install`                            | Reinstall dependencies       |
| Stale node_modules   | `rm -rf node_modules && pnpm install`     | Clean install                |

## 📝 Test Naming Convention

All tests follow naming pattern:

```
[Component/Feature] - [Type] - [Scenario]
```

Examples:

- `Config Error Panel - Visual Tests - renders error panel with correct visual hierarchy`
- `EnvValidator Component - Unit Tests - should render children when environment variables are valid`

## 🎯 Key Test Scenarios

### Visual Tests

- Error panel displays with all required sections
- Responsive across viewport sizes
- Color scheme and styling correct
- Interactive elements accessible

### Unit Tests

- Component renders correctly in both success and error states
- Error messages contain expected content
- Help section displays with proper formatting
- Accessibility attributes present

## 🔗 Related Documentation

- [`CONFIG_ERROR_PANEL_TESTS.md`](./CONFIG_ERROR_PANEL_TESTS.md) - Full implementation guide
- `tests/e2e/config-error-panel.spec.ts` - Test source code
- `components/providers/EnvValidator.test.tsx` - Unit test source code
- `app/error-panel-demo/page.tsx` - Demo page source code

## 💡 Tips & Tricks

### Debug E2E Tests

```bash
# Show browser during test
pnpm playwright test --headed

# Pause on failure
pnpm playwright test --debug

# Slow down execution
pnpm playwright test --headed --slowMo=1000
```

### Debug Unit Tests

```bash
# Inspect component rendering
screen.debug()

# Log specific elements
console.log(await screen.getByText('...').textContent())

# Interactive debugging
pnpm test --inspect-brk
```

### View Test Output

```bash
# E2E tests
pnpm playwright test --reporter=html
pnpm playwright test --reporter=list
pnpm playwright test --reporter=dot

# Unit tests
pnpm test --reporter=verbose
pnpm test --reporter=tap
```

## ✅ Checklist for Changes

Before committing changes:

- [ ] All unit tests pass: `pnpm test`
- [ ] All E2E tests pass: `pnpm playwright test`
- [ ] Snapshots updated (if intentional): `pnpm playwright test --update-snapshots`
- [ ] Coverage maintained or improved: `pnpm test --coverage`
- [ ] No console errors or warnings
- [ ] Accessibility verified
- [ ] Component works on mobile/tablet viewports
- [ ] Documentation updated

## 📞 Support

For help:

1. Check common issues above
2. Review full documentation in `CONFIG_ERROR_PANEL_TESTS.md`
3. Check test source files for examples
4. Run tests with `--debug` or `--ui` for interactive debugging
