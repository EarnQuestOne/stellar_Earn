'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { UserMenu } from '@/components/layout/UserMenu';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { WalletModal } from '@/components/wallet/WalletModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import {
  isActiveRoute,
  useTranslatedNavigation,
} from '@/lib/config/navigation';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const { navigationItems } = useTranslatedNavigation();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-backdrop-filter:bg-zinc-900/60">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Open mobile menu"
          className="inline-flex rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
          onClick={onOpenMobileMenu}
          type="button"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>

        <div className="hidden items-center gap-1 lg:flex">
          {navigationItems.slice(0, 4).map((item) => {
            const active = isActiveRoute(pathname, item);
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div
          className="ml-auto flex flex-1 items-center gap-2 sm:gap-3 sm:max-w-2xl"
          data-onboarding="global-search"
        >
          <GlobalSearch />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />
          <div className="hidden md:block">
            <ConnectButton />
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800 sm:px-6 lg:px-8">
        <Breadcrumbs />
      </div>

      <WalletModal />
    </header>
  );
}
