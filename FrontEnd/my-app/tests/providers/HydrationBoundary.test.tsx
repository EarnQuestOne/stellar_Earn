import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HydrationBoundary } from '@/app/providers/HydrationBoundary';

describe('HydrationBoundary Component', () => {
  beforeEach(() => {
    // Clear any component state between tests
  });

  it('should render nothing initially (server render)', () => {
    const { container: _container } = render(
      <HydrationBoundary>
        <div>Client Content</div>
      </HydrationBoundary>
    );

    expect(_container.firstChild).toBeEmptyDOMElement();
  });

  it('should render children after hydration', async () => {
    render(
      <HydrationBoundary>
        <div data-testid="hydrated-content">Hydrated Content</div>
      </HydrationBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('hydrated-content')).toBeInTheDocument();
    });
  });

  it('should render fallback on server', () => {
    const { container: _container } = render(
      <HydrationBoundary
        fallback={<div data-testid="fallback">Loading...</div>}
      >
        <div>Client Content</div>
      </HydrationBoundary>
    );

    // Initially should show fallback
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should replace fallback with content after hydration', async () => {
    render(
      <HydrationBoundary
        fallback={<div data-testid="fallback">Loading...</div>}
      >
        <div data-testid="actual-content">Actual Content</div>
      </HydrationBoundary>
    );

    // After hydration completes
    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('actual-content')).toBeInTheDocument();
    });
  });

  it('should handle providers inside boundary', async () => {
    const TestProvider = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="provider">{children}</div>
    );

    render(
      <HydrationBoundary>
        <TestProvider>
          <div data-testid="nested-content">Nested Content</div>
        </TestProvider>
      </HydrationBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('provider')).toBeInTheDocument();
      expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    });
  });

  it('should only hydrate once', async () => {
    const { rerender } = render(
      <HydrationBoundary>
        <div data-testid="content-1">Content 1</div>
      </HydrationBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('content-1')).toBeInTheDocument();
    });

    // Rerender with different content
    rerender(
      <HydrationBoundary>
        <div data-testid="content-2">Content 2</div>
      </HydrationBoundary>
    );

    // Should still be hydrated (content-1 no longer exists, content-2 is shown)
    await waitFor(() => {
      expect(screen.getByTestId('content-2')).toBeInTheDocument();
    });
  });
});
