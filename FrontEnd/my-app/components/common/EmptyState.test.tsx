import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState title="No results" description="Try a different query" />
    );

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try a different query')).toBeInTheDocument();
  });

  it('has a status role for screen readers', () => {
    render(<EmptyState title="Empty" description="Nothing here" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the default document icon when no icon is provided', () => {
    const { container } = render(
      <EmptyState title="Empty" description="Nothing here" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a custom icon when provided', () => {
    render(
      <EmptyState
        title="No data"
        description="No items available"
        icon={<span data-testid="custom-icon" />}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    // Default SVG should not be present
    expect(
      document.querySelector('svg[aria-hidden="true"]')
    ).not.toBeInTheDocument();
  });
});
