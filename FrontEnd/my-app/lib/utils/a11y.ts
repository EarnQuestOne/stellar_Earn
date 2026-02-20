/**
 * Accessibility utility functions
 */

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (
    element.hasAttribute('tabindex') &&
    element.getAttribute('tabindex') !== '-1'
  ) {
    return true;
  }

  if (element.hasAttribute('disabled')) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];

  if (focusableTags.includes(tagName)) {
    return true;
  }

  if (tagName === 'a' && element.hasAttribute('href')) {
    return true;
  }

  return false;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(
    container.querySelectorAll<HTMLElement>(selector)
  ).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.offsetParent !== null // Visible elements only
  );
}

/**
 * Get the first focusable element in a container
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable[0] || null;
}

/**
 * Get the last focusable element in a container
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable[focusable.length - 1] || null;
}

/**
 * Check if color contrast meets WCAG AA standards
 * @param foreground - Foreground color (hex, rgb, or hsl)
 * @param background - Background color (hex, rgb, or hsl)
 * @param level - WCAG level ('AA' or 'AAA')
 * @returns Object with pass status and ratio
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): { pass: boolean; ratio: number; level: 'AA' | 'AAA' } {
  const getLuminance = (color: string): number => {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255;
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  const thresholds = {
    AA: { normal: 4.5, large: 3.0 },
    AAA: { normal: 7.0, large: 4.5 },
  };

  const threshold = thresholds[level].normal; // Can be extended to support large text
  const pass = ratio >= threshold;

  return { pass, ratio, level };
}

/**
 * Generate a unique ID for ARIA attributes
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Format keyboard shortcut for display
 */
export function formatKeyboardShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map((key) => {
      const normalized = key.trim().toLowerCase();
      switch (normalized) {
        case 'ctrl':
        case 'control':
          return 'Ctrl';
        case 'shift':
          return 'Shift';
        case 'alt':
          return 'Alt';
        case 'meta':
        case 'cmd':
          return '⌘';
        default:
          return normalized.toUpperCase();
      }
    })
    .join(' + ');
}

/**
 * Announce to screen readers (if A11yAnnouncer is available)
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // This will be used by components that have access to A11yAnnouncer context
  // For standalone use, create an aria-live region
  const region = document.getElementById('a11y-announcer');
  if (region) {
    region.setAttribute('aria-live', priority);
    region.textContent = message;
  }
}
