"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/hooks/useTheme";

export default function SettingsPage() {
  const { isDark } = useTheme();

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage app preferences and account experience.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Appearance
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Choose a theme for the interface. Current:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {isDark ? "Dark" : "Light"}
              </span>
            </p>
            <div className="mt-4">
              <ThemeToggle showLabel />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Notifications
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Configure email and in-app notification preferences.
            </p>
            <div className="mt-4">
              <Link
                href="/settings/notifications"
                className="inline-flex items-center rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0ab8d4]"
              >
                Open Notification Settings
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
