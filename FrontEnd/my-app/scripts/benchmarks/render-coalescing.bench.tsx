import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@/components/layout/Breadcrumbs', () => ({
  Breadcrumbs: () => <div />,
}));
vi.mock('@/components/layout/UserMenu', () => ({ UserMenu: () => <div /> }));
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
vi.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => <div /> }));
vi.mock('@/components/search/GlobalSearch', () => ({
  GlobalSearch: () => <div />,
}));

import { Header } from '@/components/layout/Header';
import { QuestListFilters } from '@/components/quest/QuestListFilters';

const PARENT_RERENDERS = 20;
const RAPID_CHANGES = 20;

describe('render coalescing benchmark (#2498, #2499)', () => {
  it('measures Header re-renders and filter callback coalescing', () => {
    vi.useFakeTimers();
    useTranslatedNavigation.mockReturnValue({
      navigationItems: [
        { href: '/dashboard', labelKey: 'nav.dashboard', label: 'Dashboard' },
        { href: '/quests', labelKey: 'nav.quests', label: 'Quests' },
      ],
      userMenuItems: [],
    });

    // --- Header: stable vs unstable prop identity across parent re-renders ---
    const stable = vi.fn();
    useTranslatedNavigation.mockClear();
    const { rerender } = render(<Header onOpenMobileMenu={stable} />);
    for (let i = 0; i < PARENT_RERENDERS; i++) {
      rerender(<Header onOpenMobileMenu={stable} />);
    }
    const memoizedRenders = useTranslatedNavigation.mock.calls.length;

    useTranslatedNavigation.mockClear();
    const { rerender: rerenderUnstable } = render(
      <Header onOpenMobileMenu={vi.fn()} />
    );
    for (let i = 0; i < PARENT_RERENDERS; i++) {
      rerenderUnstable(<Header onOpenMobileMenu={vi.fn()} />);
    }
    const unmemoizedRenders = useTranslatedNavigation.mock.calls.length;

    // --- QuestListFilters: debounced vs immediate propagation ---
    let debouncedCalls = 0;
    const { container } = render(
      <QuestListFilters
        onStatusChange={() => {}}
        onDifficultyChange={() => {}}
        onCategoryChange={() => {}}
        onRewardRangeChange={() => {
          debouncedCalls += 1;
        }}
        onClearFilters={() => {}}
      />
    );
    const input = container.querySelector(
      'input[aria-label="Minimum reward in XLM"]'
    ) as HTMLInputElement;
    for (let i = 1; i <= RAPID_CHANGES; i++) {
      fireEvent.change(input, { target: { value: String(i) } });
    }
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Within a single debounce window the component propagates at most once,
    // whereas the immediate baseline propagates once per change.
    const debouncedPropagations = debouncedCalls;
    const immediateBaseline = RAPID_CHANGES;
    vi.useRealTimers();

    const metrics = {
      header: {
        parentRerenders: PARENT_RERENDERS,
        memoizedRenders,
        unmemoizedRenders,
        rendersAvoided: unmemoizedRenders - memoizedRenders,
      },
      questListFilters: {
        rapidChanges: RAPID_CHANGES,
        immediateBaseline,
        debouncedPropagations,
        callsAvoided: immediateBaseline - debouncedPropagations,
      },
    };

    const outPath =
      process.env.RENDER_COALESCING_BENCH_OUT ||
      resolve(__dirname, 'results', 'render-coalescing.latest.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), metrics },
        null,
        2
      )
    );

    expect(memoizedRenders).toBeLessThan(unmemoizedRenders);
    expect(debouncedPropagations).toBeLessThan(immediateBaseline);

    // Surface the numbers in the run output.
    console.log('render-coalescing benchmark', JSON.stringify(metrics));
  });
});
