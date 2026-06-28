import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Sidebar } from './Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/quests',
}));

const MockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="mock-icon" {...props} />
);

vi.mock('@/lib/config/navigation', () => ({
  useTranslatedNavigation: () => ({
    navigationItems: [
      {
        href: '/dashboard',
        labelKey: 'nav.dashboard',
        label: 'Dashboard',
        icon: MockIcon,
      },
      {
        href: '/quests',
        labelKey: 'nav.quests',
        label: 'Quests',
        icon: MockIcon,
      },
      {
        href: '/submissions',
        labelKey: 'nav.submissions',
        label: 'Submissions',
      },
    ],
  }),
  isActiveRoute: (pathname: string, item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
}));

describe('Sidebar', () => {
  it('renders navigation items with labels', () => {
    render(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
    expect(screen.getByText('Submissions')).toBeInTheDocument();
  });

  it('renders lucide icons for items with icon property', () => {
    render(<Sidebar />);

    const icons = screen.getAllByTestId('mock-icon');
    expect(icons.length).toBe(2);
  });

  it('renders NavDot fallback for items without icon', () => {
    render(<Sidebar />);

    const submissionsLink = screen.getByText('Submissions').closest('a');
    const navDot = submissionsLink?.querySelector('.rounded-full');
    expect(navDot).toBeInTheDocument();
  });

  it('does not render labels when collapsed', () => {
    render(<Sidebar collapsed />);

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Quests')).not.toBeInTheDocument();
  });

  it('has correct aria-label on aside element', () => {
    render(<Sidebar />);

    expect(
      screen.getByRole('complementary', { name: /sidebar navigation/i })
    ).toBeInTheDocument();
  });
});
