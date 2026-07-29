import { memo } from 'react';
import type { ComponentType } from 'react';

/**
 * Shallow-compares props, ignoring function-valued ones (callbacks are
 * expected to be memoized separately with useCallback). Closes #1930.
 */
export function shallowEqualIgnoringCallbacks<P extends object>(
  prev: P,
  next: P,
): boolean {
  const prevKeys = Object.keys(prev) as (keyof P)[];
  const nextKeys = Object.keys(next) as (keyof P)[];
  if (prevKeys.length !== nextKeys.length) return false;

  return prevKeys.every((key) => {
    const prevVal = prev[key];
    if (typeof prevVal === 'function') return true;
    return prevVal === next[key];
  });
}

/**
 * Wrap a list-item component (QuestList/RecentSubmissions/SubmissionsList/
 * SubmissionsTable rows) so unrelated parent-list state updates don't force
 * a re-render of every row.
 */
export function memoizeListItem<P extends object>(Component: ComponentType<P>) {
  return memo(Component, shallowEqualIgnoringCallbacks);
}
