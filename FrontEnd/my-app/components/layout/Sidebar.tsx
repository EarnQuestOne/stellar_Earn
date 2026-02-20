"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute, navigationItems } from "@/lib/config/navigation";

interface SidebarProps {
  collapsed?: boolean;
}

function NavIcon({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 rounded-full ${active ? "bg-white" : "bg-zinc-400"}`}
    />
  );
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`hidden border-r border-zinc-200 bg-white transition-[width] duration-300 dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:flex-col ${
        collapsed ? "lg:w-20" : "lg:w-72"
      }`}
    >
      <div
        className={`flex h-16 items-center border-b border-zinc-200 dark:border-zinc-800 ${
          collapsed ? "justify-center px-2" : "justify-start px-5"
        }`}
      >
        <Link
          aria-label="Go to home"
          className="flex items-center gap-2 overflow-hidden"
          href="/"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#089ec3] text-sm font-bold text-white">
            S
          </span>
          {!collapsed && (
            <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Stellar Earn
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3" role="navigation">
        {navigationItems.map((item) => {
          const active = isActiveRoute(pathname, item);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#089ec3] ${
                active
                  ? "bg-[#089ec3] text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
              href={item.href}
              key={item.href}
              title={collapsed ? item.label : undefined}
            >
              <span className="mr-3 flex h-5 w-5 items-center justify-center">
                <NavIcon active={active} />
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">Navigation</span>
      </div>
    </aside>
  );
}
