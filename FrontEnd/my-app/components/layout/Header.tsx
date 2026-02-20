"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { UserMenu } from "@/components/layout/UserMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { WalletModal } from "@/components/wallet/WalletModal";
import { isActiveRoute, navigationItems } from "@/lib/config/navigation";

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Open mobile menu"
          className="inline-flex rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#089ec3] dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
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
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#089ec3] ${
                  active
                    ? "bg-[#089ec3]/10 text-[#089ec3]"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
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
