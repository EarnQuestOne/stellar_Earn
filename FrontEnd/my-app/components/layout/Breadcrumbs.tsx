"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRouteLabel } from "@/lib/config/navigation";

interface Crumb {
  href: string;
  label: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label: getRouteLabel(segment),
  }));

  if (crumbs.length === 0) {
    return (
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <li>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">Home</span>
          </li>
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <li>
          <Link
            className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            href="/"
          >
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li className="flex items-center gap-2" key={crumb.href}>
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              {isLast ? (
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                  href={crumb.href}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
