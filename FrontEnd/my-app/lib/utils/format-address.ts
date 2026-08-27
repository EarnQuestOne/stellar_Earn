/**
 * Truncate a long address or ID for display, preserving a prefix and suffix
 * separated by an ellipsis.
 *
 * Returns the original string unchanged when it is short enough to fit
 * without truncation (≤ `maxTotal` characters).
 *
 * @param value - The full string to truncate.
 * @param prefix - Number of leading characters to keep (default 6).
 * @param suffix - Number of trailing characters to keep (default 4).
 * @param maxTotal - Minimum length before truncation kicks in (default 12).
 * @returns The truncated or original string.
 */
export function truncateAddress(
  value: string | null | undefined,
  prefix = 6,
  suffix = 4,
  maxTotal = 12,
): string {
  if (!value) return '';
  if (value.length <= maxTotal) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}
