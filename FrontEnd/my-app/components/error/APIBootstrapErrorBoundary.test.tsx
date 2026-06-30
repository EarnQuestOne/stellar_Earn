import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { APIBootstrapErrorBoundary } from '@/components/error/APIBootstrapErrorBoundary';
import { BootstrapErrorFallback } from '@/components/error/BootstrapErrorFallback';

/**
 * Test suite for APIBootstrapErrorBoundary component
 */
describe('APIBootstrapErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render children without error', () => {
    render(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <div>Test Content</div>
      </APIBootstrapErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should catch and display render errors', () => {
    const ThrowError = () => {
      throw new Error('Test render error');
    };

    render(
      <APIBootstrapErrorBoundary componentName="FailingComponent">
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    expect(
      screen.getByText(/Failed to Load FailingComponent/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/issue while loading this section/i)
    ).toBeInTheDocument();
  });

  it('should display retry button', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    const retryButton = screen.getByRole('button', {
      name: /Try loading TestComponent again/i,
    });
    expect(retryButton).toBeInTheDocument();
  });

  it('should allow manual reset via retry button', async () => {
    let shouldThrow = true;

    const ConditionalError = () => {
      if (shouldThrow) {
        throw new Error('Conditional error');
      }
      return <div>Success</div>;
    };

    const { rerender } = render(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <ConditionalError />
      </APIBootstrapErrorBoundary>
    );

    expect(
      screen.getByText(/Failed to Load TestComponent/i)
    ).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click retry button
    const retryButton = screen.getByRole('button', {
      name: /Try loading TestComponent again/i,
    });
    fireEvent.click(retryButton);

    // Rerender to update
    rerender(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <ConditionalError />
      </APIBootstrapErrorBoundary>
    );

    // Component should be recovered
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('should call onError callback when error is caught', () => {
    const onErrorMock = vi.fn();

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <APIBootstrapErrorBoundary
        componentName="TestComponent"
        onError={onErrorMock}
      >
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      'TestComponent'
    );
  });

  it('should use custom fallback component when provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomFallback = ({ error, resetError, componentName }: any) => (
      <div>
        Custom Fallback: {componentName} - {error.message}
        <button onClick={resetError}>Custom Retry</button>
      </div>
    );

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <APIBootstrapErrorBoundary
        componentName="TestComponent"
        fallback={CustomFallback}
      >
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    expect(
      screen.getByText(/Custom Fallback: TestComponent/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Custom Retry/i })
    ).toBeInTheDocument();
  });

  it('should show retry count when retrying multiple times', async () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    // First error should show without retry count initially
    expect(screen.queryByText(/Retry attempts:/)).not.toBeInTheDocument();

    // Click retry button multiple times
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.getByRole('button', {
        name: /Try loading TestComponent again/i,
      });
      fireEvent.click(retryButton);
    }

    // After retrying, should show retry count
    await waitFor(() => {
      expect(screen.getByText(/Retry attempts:/)).toBeInTheDocument();
    });
  });

  it('should display "Go Home" button for navigation', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: /Go to homepage/i });
    expect(homeButton).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <APIBootstrapErrorBoundary componentName="TestComponent">
        <ThrowError />
      </APIBootstrapErrorBoundary>
    );

    const alertDiv = screen.getByRole('alert');
    expect(alertDiv).toHaveAttribute('aria-live', 'assertive');
  });
});

/**
 * Test suite for BootstrapErrorFallback component
 */
describe('BootstrapErrorFallback', () => {
  const mockResetError = vi.fn();

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render error message', () => {
    const error = new Error('Test error message');

    render(
      <BootstrapErrorFallback
        error={error}
        resetError={mockResetError}
        componentName="TestComponent"
      />
    );

    expect(
      screen.getByText(/Failed to Load TestComponent/i)
    ).toBeInTheDocument();
  });

  it('should detect and display network errors', () => {
    const networkError = new Error('Network connection failed');

    render(
      <BootstrapErrorFallback
        error={networkError}
        resetError={mockResetError}
        componentName="TestComponent"
      />
    );

    expect(screen.getByText(/Network Error Loading/i)).toBeInTheDocument();
  });

  it('should detect and display timeout errors', () => {
    const timeoutError = new Error('Request timeout after 30000ms');

    render(
      <BootstrapErrorFallback
        error={timeoutError}
        resetError={mockResetError}
        componentName="TestComponent"
      />
    );

    expect(screen.getByText(/Taking Too Long/i)).toBeInTheDocument();
  });

  it('should call resetError when retry button is clicked', () => {
    const error = new Error('Test error');

    render(
      <BootstrapErrorFallback
        error={error}
        resetError={mockResetError}
        componentName="TestComponent"
      />
    );

    const retryButton = screen.getByRole('button', {
      name: /Retry loading TestComponent/i,
    });
    fireEvent.click(retryButton);

    expect(mockResetError).toHaveBeenCalled();
  });

  it('should show recovery tips', () => {
    const error = new Error('Test error');

    render(
      <BootstrapErrorFallback
        error={error}
        resetError={mockResetError}
        componentName="TestComponent"
      />
    );

    expect(screen.getByText(/What you can try:/i)).toBeInTheDocument();
    expect(screen.getByText(/Refresh the page/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Check your internet connection/i)
    ).toBeInTheDocument();
  });

  it('should display retry count when provided', () => {
    const error = new Error('Test error');

    render(
      <BootstrapErrorFallback
        error={error}
        resetError={mockResetError}
        componentName="TestComponent"
        retryCount={3}
      />
    );

    expect(screen.getByText(/Retry attempts: 3/i)).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = 'development';

    const error = new Error('Test error stack trace');
    error.stack = 'Error: Test error\n  at Function.test';

    render(
      <BootstrapErrorFallback
        error={error}
        resetError={mockResetError}
        componentName="TestComponent"
        showDetails={true}
      />
    );

    const detailsButton = screen.getByText(/Error Details/i);
    fireEvent.click(detailsButton);

    expect(screen.getByText(/Test error stack trace/i)).toBeInTheDocument();

    (process.env as Record<string, string>).NODE_ENV = originalEnv;
  });
});
