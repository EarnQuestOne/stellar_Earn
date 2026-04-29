# Modal Focus Management Implementation

## Overview
This document summarizes the accessibility improvements made to implement proper focus management across all modals in the StellarEarn frontend application.

## Issue Reference
- **GitHub Issue**: #23
- **Labels**: frontend, accessibility, priority-low

## Problem
Modals were not managing focus properly, creating accessibility issues for keyboard users and screen reader users. When a modal opened:
- Focus was not trapped within the modal
- Users could tab outside the modal to elements behind it
- Focus was not restored to the triggering element when the modal closed
- Keyboard navigation did not follow WAI-ARIA dialog best practices

## Solution
Implemented focus trapping using the existing `FocusTrap` component (`/components/a11y/FocusTrap.tsx`) across all modal dialogs.

### What is Focus Trapping?
Focus trapping ensures that when a modal is open, keyboard focus (Tab/Shift+Tab) cycles only within the modal's interactive elements. This is essential for:
- Screen reader users
- Keyboard-only users
- Users with motor disabilities
- WCAG 2.1 Level A compliance (Success Criterion 2.4.3)

## Changes Made

### 1. LevelUpModal (`/components/ui/LevelUpModal.tsx`)
**Before**: Manual focus management without proper trapping
**After**: Wrapped modal content with `<FocusTrap active={isOpen}>`

```typescript
import { FocusTrap } from '@/components/a11y/FocusTrap';

// Inside the modal JSX:
<FocusTrap active={isOpen}>
  <div ref={modalRef} className="..." tabIndex={-1}>
    {/* Modal content */}
  </div>
</FocusTrap>
```

### 2. WalletModal (`/components/wallet/WalletModal.tsx`)
**Before**: No focus management
**After**: Added FocusTrap wrapper

```typescript
import { FocusTrap } from '@/components/a11y/FocusTrap';

// Wrapped modal content
<FocusTrap active={isModalOpen}>
  <motion.div>
    {/* Wallet selection UI */}
  </motion.div>
</FocusTrap>
```

### 3. WalletConnectionModal (`/components/wallet/WalletConnectionModal.tsx`)
**Before**: No focus management
**After**: Added FocusTrap wrapper

```typescript
import { FocusTrap } from '@/components/a11y/FocusTrap';

// Wrapped modal content
<FocusTrap active={isModalOpen}>
  <motion.div>
    {/* Connection UI */}
  </motion.div>
</FocusTrap>
```

### 4. EditProfileModal (`/components/profile/EditProfileModal.tsx`)
**Before**: No focus management
**After**: Added FocusTrap wrapper

```typescript
import { FocusTrap } from '@/components/a11y/FocusTrap';

// Wrapped modal content
<FocusTrap active={isOpen}>
  <div className="bg-zinc-900 ...">
    {/* Profile editing form */}
  </div>
</FocusTrap>
```

### 5. SubmissionDetail (`/components/submission/SubmissionDetail.tsx`)
**Before**: Manual focus management without trapping
**After**: Added FocusTrap wrapper

```typescript
import { FocusTrap } from '@/components/a11y/FocusTrap';

// Wrapped modal content
<FocusTrap active={isOpen}>
  <div ref={modalRef} className="..." tabIndex={-1}>
    {/* Submission details */}
  </div>
</FocusTrap>
```

### 6. Already Compliant Modals
These modals already had proper focus trapping:
- **Modal** (`/components/ui/Modal.tsx`) - Base modal component
- **WelcomeModal** (`/components/onboarding/WelcomeModal.tsx`) - Uses the base Modal component
- **TransactionModal** (`/components/rewards/TransactionModal.tsx`) - Uses the base Modal component
- **SubmissionSuccessModal** (`/components/ui/Modal.tsx`) - Uses the base Modal component

## FocusTrap Component Features

The existing `FocusTrap` component provides:

1. **Focus Containment**: Traps Tab/Shift+Tab within the modal
2. **Focus Wrapping**: 
   - Tab on last element → focuses first element
   - Shift+Tab on first element → focuses last element
3. **Initial Focus**: Automatically focuses the first focusable element or a specified element
4. **Focus Restoration**: Returns focus to the previously focused element when modal closes
5. **Visible Elements Only**: Only traps focus in visible, enabled elements
6. **Escape Prevention**: Works alongside Escape key handlers for modal dismissal

## Accessibility Improvements

### Keyboard Navigation
✅ **Tab** - Moves focus forward through interactive elements  
✅ **Shift+Tab** - Moves focus backward through interactive elements  
✅ **Escape** - Closes modal (handled by parent components)  
✅ **Focus Cycling** - Focus wraps from last to first element and vice versa  

### Screen Reader Support
✅ **role="dialog"** - Identifies the element as a dialog  
✅ **aria-modal="true"** - Indicates modal behavior  
✅ **aria-labelledby** - Links to the modal title  
✅ **Focus Management** - Clear focus indicators for keyboard users  

### Best Practices Implemented
✅ Prevents body scroll when modal is open  
✅ Restores focus when modal closes  
✅ Traps focus within modal boundaries  
✅ Supports dynamic content updates  
✅ Works with nested focusable elements  

## Testing

### Manual Testing Checklist
- [ ] Open each modal using keyboard (Enter/Space on trigger button)
- [ ] Press Tab and verify focus moves through all interactive elements
- [ ] Press Shift+Tab and verify focus moves in reverse
- [ ] Verify focus wraps from last element to first on Tab
- [ ] Verify focus wraps from first element to last on Shift+Tab
- [ ] Press Escape and verify modal closes
- [ ] Verify focus returns to the trigger button after closing
- [ ] Verify focus never escapes to elements behind the modal

### Automated Testing
Created test structure in `/tests/a11y/modal-focus.test.ts` with Playwright tests for:
- Focus trapping within modal
- Focus restoration on close
- Escape key functionality
- Initial focus management
- Focus cycling (Tab/Shift+Tab)
- Focus containment

## WCAG Compliance

This implementation addresses the following WCAG 2.1 success criteria:

- **2.4.3 Focus Order (Level A)**: Focus moves in a meaningful order
- **2.4.7 Focus Visible (Level AA)**: Focus indicator is always visible
- **4.1.2 Name, Role, Value (Level A)**: Proper ARIA attributes for dialogs

## Developer Notes

### Using FocusTrap in New Modals

```typescript
import { FocusTrap } from '@/components/a11y/FocusTrap';

function MyModal({ isOpen, onClose }: ModalProps) {
  return (
    <div role="dialog" aria-modal="true">
      <FocusTrap active={isOpen}>
        <div tabIndex={-1}>
          {/* Modal content with interactive elements */}
          <button onClick={onClose}>Close</button>
        </div>
      </FocusTrap>
    </div>
  );
}
```

### Important Considerations
1. Always set `active={isOpen}` to enable/disable trapping
2. The modal container should have `tabIndex={-1}` for programmatic focus
3. Include `role="dialog"` and `aria-modal="true"` on the overlay
4. Use `aria-labelledby` to reference the modal title
5. The FocusTrap handles focus restoration automatically

## Files Modified
1. `/components/ui/LevelUpModal.tsx`
2. `/components/wallet/WalletModal.tsx`
3. `/components/wallet/WalletConnectionModal.tsx`
4. `/components/profile/EditProfileModal.tsx`
5. `/components/submission/SubmissionDetail.tsx`
6. `/tests/a11y/modal-focus.test.ts` (new)

## Next Steps
- [ ] Run manual accessibility testing with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Test with keyboard-only navigation
- [ ] Update E2E tests to include focus management checks
- [ ] Consider adding focus trap visual indicators for debugging
- [ ] Document accessibility patterns in contributing guide

## References
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog/)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [MDN: Focus Management](https://developer.mozilla.org/en-US/docs/Web/API/Focus_API)

---

**Implementation Date**: 2026-04-28  
**Issue**: Close #23
