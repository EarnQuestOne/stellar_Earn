/**
 * WCAG 2.1 color contrast ratio utilities.
 * https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

/** Parse a hex color string (#rrggbb or #rgb) into [r, g, b] 0-255. */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Relative luminance of an sRGB color per WCAG 2.1. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(...hexToRgb(hex1));
  const l2 = relativeLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA requires ≥ 4.5:1 for normal text, ≥ 3:1 for large text / UI. */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3.0;
export const WCAG_AAA_NORMAL = 7.0;

export function meetsWCAG_AA(
  hex1: string,
  hex2: string,
  large = false
): boolean {
  return contrastRatio(hex1, hex2) >= (large ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
}
