"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { userMenuItems } from "@/lib/config/navigation";

interface UserMenuProps {
  username?: string;
}

export function UserMenu({ username = "john.doe" }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const initials = useMemo(
    () =>
      username
        .split(".")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [username],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    const focusableItems = itemRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (focusableItems.length === 0) return;

    const currentIndex = focusableItems.findIndex(
      (item) => item === document.activeElement,
    );

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % focusableItems.length;
      focusableItems[nextIndex].focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const previousIndex =
        currentIndex <= 0 ? focusableItems.length - 1 : currentIndex - 1;
      focusableItems[previousIndex].focus();
    }
  };

  return (
    <div className="relative" onKeyDown={handleMenuKeyDown} ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#089ec3] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#089ec3] text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden md:block">{username}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </button>

      <div
        aria-label="User menu"
        className={`absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900 ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        role="menu"
      >
        {userMenuItems.map((item, index) => (
          <Link
            className="block rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800"
            href={item.href}
            key={item.href}
            onClick={() => setIsOpen(false)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="menuitem"
            tabIndex={isOpen ? 0 : -1}
          >
            {item.label}
          </Link>
        ))}
        <button
          className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none dark:text-rose-400 dark:hover:bg-rose-950/30 dark:focus-visible:bg-rose-950/30"
          role="menuitem"
          type="button"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
