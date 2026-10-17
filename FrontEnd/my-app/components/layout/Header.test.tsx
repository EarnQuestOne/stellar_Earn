import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useTranslatedNavigation } = vi.hoisted(() => ({
  useTranslatedNavigation: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/quests',
}));

vi.mock('@/lib/config/navigation', () => ({
  useTranslatedNavigation,
  isActiveRoute: (pathname: string, item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
}));

// Replace the heavy children with inert stubs so the test exercises the
// Header's own render/memoization behaviour without pulling in wallet,
// notification, and internationalization providers.
vi.mock('@/components/layout/Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}));
vi.mock('@/components/layout/UserMenu', () => ({
  UserMenu: () => <div />,
}));
vi.mock('@/components/layout/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div />,
}));
vi.mock('@/components/notifications/NotificationBell', () => ({
  default: () => <div />,
}));
vi.mock('@/components/wallet/ConnectButton', () => ({
  ConnectButton: () => <div />,
}));
vi.mock('@/components/wallet/WalletModal', () => ({
  WalletModal: () => <div />,
}));
vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div />,
}));
vi.mock('@/components/search/GlobalSearch', () => ({
  GlobalSearch: () => <div />,
}));

import { Header } from './Header';

describe('Header memoization (#2498)', () => {
  beforeEach(() => {
    useTranslatedNavigation.mockClear();
    useTranslatedNavigation.mockReturnValue({
      navigationItems: [
        { href: '/dashboard', labelKey: 'nav.dashboard', label: 'Dashboard' },
        { href: '/quests', labelKey: 'nav.quests', label: 'Quests' },
      ],
      userMenuItems: [],
    });
  });

  it('renders the translated navigation items', () => {
    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
  });

  it('marks the active route with aria-current', () => {
    render(<Header />);

    expect(screen.getByText('Quests').closest('a')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('Dashboard').closest('a')).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('does not re-render when an ancestor re-renders with equal props', () => {
    const onOpenMobileMenu = vi.fn();
    const { rerender } = render(<Header onOpenMobileMenu={onOpenMobileMenu} />);

    expect(useTranslatedNavigation).toHaveBeenCalledTimes(1);

    // Same props reference — the memoized component must bail out.
    rerender(<Header onOpenMobileMenu={onOpenMobileMenu} />);

    expect(useTranslatedNavigation).toHaveBeenCalledTimes(1);
  });

  it('re-renders when its callback prop changes', () => {
    const { rerender } = render(<Header onOpenMobileMenu={vi.fn()} />);

    expect(useTranslatedNavigation).toHaveBeenCalledTimes(1);

    rerender(<Header onOpenMobileMenu={vi.fn()} />);

    expect(useTranslatedNavigation).toHaveBeenCalledTimes(2);
  });
});
