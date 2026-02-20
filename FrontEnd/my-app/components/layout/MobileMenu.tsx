"use client";

import Link from "next/link";
import { useEffect } from "react";
import { isActiveRoute, navigationItems } from "@/lib/config/navigation";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}

export function MobileMenu({ isOpen, onClose, pathname }: MobileMenuProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-40 lg:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <button
        aria-label="Close mobile menu"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Mobile navigation menu"
        className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-zinc-200 bg-white shadow-2xl transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#089ec3] text-sm font-bold text-white">
              S
            </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">Menu</span>
          </div>
          <button
            aria-label="Close mobile menu"
            className="rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#089ec3] dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {navigationItems.map((item) => {
            const active = isActiveRoute(pathname, item);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#089ec3] ${
                  active
                    ? "bg-[#089ec3] text-white"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
