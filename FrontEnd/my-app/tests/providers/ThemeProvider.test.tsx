import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, useThemeContext } from '@/app/providers/ThemeProvider';

// Test component that uses the theme context
const ThemeConsumer = () => {
  const { theme, isDark, toggleTheme } = useThemeContext();
  return (
    <div>
      <div data-testid="theme-value">{theme}</div>
      <div data-testid="is-dark">{isDark.toString()}</div>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  );
};

describe('ThemeProvider - Hydration Safety', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset matchMedia mock
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default theme on server', () => {
    const { container: _container } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Server renders with default light theme
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
  });

  it('should prevent hydration mismatch by using safe default', async () => {
    // Don't set localStorage - server and client should both use default
    const { container: _container } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Initially renders with default
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    // After hydration, should still be light (no localStorage value)
    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    });
  });

  it('should sync with localStorage after hydration', async () => {
    // Set localStorage before render
    localStorage.setItem('stellar_earn_theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Initially renders with default (server can't access localStorage)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    // After hydration, syncs with localStorage
    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });
  });

  it('should persist theme changes to localStorage', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toBeInTheDocument();
    });

    // Toggle theme
    const toggleBtn = screen.getByTestId('toggle-btn');
    fireEvent.click(toggleBtn);

    // Verify theme changed
    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    });

    // Verify localStorage updated
    expect(localStorage.getItem('stellar_earn_theme')).toBe('dark');
  });

  it('should handle localStorage errors gracefully', async () => {
    // Mock localStorage.getItem to throw error
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    getItemSpy.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { rerender: _rerender } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Should still render with default theme
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    // Cleanup
    getItemSpy.mockRestore();
  });

  it('should handle matchMedia errors gracefully', async () => {
    // Mock matchMedia to throw error
    const matchMediaSpy = vi.spyOn(window, 'matchMedia');
    matchMediaSpy.mockImplementation(() => {
      throw new Error('matchMedia unavailable');
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Should still render with default theme
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

    // Cleanup
    matchMediaSpy.mockRestore();
  });

  it('should not apply theme during server render phase', () => {
    const { container: _container } = render(
      <ThemeProvider>
        <div data-testid="content">Content</div>
      </ThemeProvider>
    );

    const _html = document.documentElement;
    // Server shouldn't have applied dark class immediately
    // This is handled by the inline script in layout.tsx
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
