'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminUser } from '@/lib/types/admin';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: AdminUser | null;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/quests', label: 'Quests', icon: '📋' },
  { href: '/admin/quests/new', label: 'Create Quest', icon: '➕' },
  { href: '/admin/submissions', label: 'Submissions', icon: '📬' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
];

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg tracking-tight">
            StellarEarn Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user && (
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {user.username}
            </span>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-64 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:block min-h-[calc(100vh-4rem)]">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
