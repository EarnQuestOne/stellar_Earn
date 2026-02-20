import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6 sm:p-8">
        <div className="mb-8" data-onboarding="settings-overview">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Configure your account preferences and walkthrough options.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Onboarding
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Replay the product tour any time from here.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard?onboarding=restart"
                className="inline-flex items-center rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0ab8d4]"
              >
                Restart onboarding tour
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Notifications
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Manage app and email notification preferences.
            </p>
            <div className="mt-4">
              <Link
                href="/settings/notifications"
                className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Open notification settings
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
