import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualizedList } from './VirtualizedList';

function renderList(itemCount: number) {
  const items = Array.from({ length: itemCount }, (_, i) => `item-${i}`);
  return render(
    <VirtualizedList
      items={items}
      itemHeight={40}
      height={200}
      ariaLabel="test list"
      renderItem={(item) => <span data-testid="row">{item}</span>}
    />
  );
}

describe('VirtualizedList', () => {
  it('renders only the rows within the viewport window, not the full set', () => {
    renderList(1000);
    const rows = screen.getAllByTestId('row');
    // viewport = ceil(200/40)=5 rows + overscan (4*2) => far fewer than 1000.
    expect(rows.length).toBeLessThan(1000);
    expect(rows.length).toBeLessThanOrEqual(20);
    expect(screen.getByText('item-0')).toBeInTheDocument();
  });

  it('reserves the full scroll height for all items', () => {
    renderList(100);
    const container = screen.getByTestId('virtualized-list');
    const spacer = container.firstElementChild as HTMLElement;
    // 100 items * 40px = 4000px total scrollable height.
    expect(spacer.style.height).toBe('4000px');
  });

  it('renders later items after scrolling', () => {
    renderList(1000);
    const container = screen.getByTestId('virtualized-list');
    Object.defineProperty(container, 'scrollTop', {
      value: 4000,
      writable: true,
    });
    fireEvent.scroll(container);
    // At scrollTop 4000 (row 100) item-0 is out of the window.
    expect(screen.queryByText('item-0')).not.toBeInTheDocument();
    expect(screen.getByText('item-100')).toBeInTheDocument();
  });

  it('handles an empty list without rendering rows', () => {
    renderList(0);
    expect(screen.queryAllByTestId('row')).toHaveLength(0);
  });
});
