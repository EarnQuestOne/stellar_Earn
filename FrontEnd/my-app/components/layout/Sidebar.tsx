'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isActiveRoute,
  useTranslatedNavigation,
} from '@/lib/config/navigation';

interface SidebarProps {
  collapsed?: boolean;
}

function NavDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 rounded-full ${active ? 'bg-white' : 'bg-zinc-400 dark:bg-zinc-600'}`}
    />
  );
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { navigationItems } = useTranslatedNavigation();

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`hidden h-screen border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-0 lg:flex lg:flex-col ${
        collapsed ? 'lg:w-20' : 'lg:w-72'
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
          S
        </span>
        {!collapsed && (
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            StellarEarn
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigationItems.map((item) => {
          const active = isActiveRoute(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? 'bg-primary text-white'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
              } ${collapsed ? 'justify-center' : 'gap-3'}`}
            >
              {item.icon ? (
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <NavDot active={active} />
              )}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
