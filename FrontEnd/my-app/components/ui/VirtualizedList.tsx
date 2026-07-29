'use client';

import React, { useCallback, useState, type UIEvent } from 'react';

export interface VirtualizedListProps<T> {
  /** Full data set. Only the rows in (and near) the viewport are rendered. */
  items: T[];
  /** Fixed height, in pixels, of every row. */
  itemHeight: number;
  /** Height, in pixels, of the scrollable viewport. */
  height: number;
  /** Render a single item. */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Stable key for an item. Falls back to the index. */
  getKey?: (item: T, index: number) => React.Key;
  /** Extra rows to render above/below the viewport to smooth fast scrolling. */
  overscan?: number;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

/**
 * A dependency-free windowing list. Long collections render only the rows in
 * view (plus a small overscan) instead of mounting every row, which keeps
 * paint time and scroll cost flat as the data set grows.
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  getKey,
  overscan = 4,
  className,
  role = 'list',
  ariaLabel,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const total = items.length;
  const totalHeight = total * itemHeight;
  const viewportCount = Math.max(1, Math.ceil(height / itemHeight));
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(total, startIndex + viewportCount + overscan * 2);
  const offsetY = startIndex * itemHeight;
  const visible = items.slice(startIndex, endIndex);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={className}
      style={{ height, overflowY: 'auto' }}
      onScroll={handleScroll}
      role={role}
      aria-label={ariaLabel}
      data-testid="virtualized-list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visible.map((item, offset) => {
            const index = startIndex + offset;
            return (
              <div
                key={getKey ? getKey(item, index) : index}
                style={{ height: itemHeight }}
                role="listitem"
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedList;
