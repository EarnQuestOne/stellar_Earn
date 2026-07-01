import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ClientOnly } from '@/app/providers/ClientOnly';

describe('ClientOnly Component', () => {
  beforeEach(() => {
    // Clear any component state between tests
  });

  it('should render nothing on initial render', () => {
    const { container: _container } = render(
      <ClientOnly>
        <div>Client Content</div>
      </ClientOnly>
    );

    expect(_container.firstChild).toBeEmptyDOMElement();
  });

  it('should render children after hydration', async () => {
    render(
      <ClientOnly>
        <div data-testid="client-content">Client Content</div>
      </ClientOnly>
    );

    await waitFor(() => {
      expect(screen.getByTestId('client-content')).toBeInTheDocument();
    });
  });

  it('should render fallback on initial server render', () => {
    const { container: _container } = render(
      <ClientOnly fallback={<div data-testid="fallback">Loading...</div>}>
        <div>Client Content</div>
      </ClientOnly>
    );

    // Initially should render fallback
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should replace fallback with children after hydration', async () => {
    render(
      <ClientOnly fallback={<div data-testid="fallback">Loading...</div>}>
        <div data-testid="client-content">Client Content</div>
      </ClientOnly>
    );

    // Wait for hydration to complete
    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('client-content')).toBeInTheDocument();
    });
  });

  it('should handle multiple children', async () => {
    render(
      <ClientOnly>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ClientOnly>
    );

    await waitFor(() => {
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
});
