"use client";

import React from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useToast } from "@/components/notifications/Toast";
import { AppLayout } from "@/components/layout/AppLayout";

export default function NotificationSettingsPage() {
  const { settings, updateSettings, addNotification } = useNotifications();
  const { showToast } = useToast();

  const handleToggle = (key: keyof typeof settings) => {
    const newValue = !settings[key];
    updateSettings({ [key]: newValue });
    showToast(`Notification ${newValue ? "enabled" : "disabled"}`, "info");
  };

  const triggerTestNotification = () => {
    addNotification({
      type: "success",
      title: "Test Notification",
      message:
        "This is a test notification to verify the system is working correctly.",
      link: "/quests",
    });
    showToast("Test notification sent!", "success");
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Notification Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage how and when you receive notifications.
          </p>
        </div>

        <div className="space-y-6">
          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Email Notifications
              </h2>
              <p className="text-sm text-zinc-500">
                Choose which updates you want to receive via email.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Quest Updates
                  </p>
                  <p className="text-sm text-zinc-500">
                    New quests matching your skills
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("questUpdates")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.questUpdates ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.questUpdates ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Submission Status
                  </p>
                  <p className="text-sm text-zinc-500">
                    Updates on your quest submissions
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("submissionStatus")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.submissionStatus ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.submissionStatus ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Reward Claims
                  </p>
                  <p className="text-sm text-zinc-500">
                    Notifications about successful payouts
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("rewardClaims")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.rewardClaims ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.rewardClaims ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                System Settings
              </h2>
              <p className="text-sm text-zinc-500">
                App-wide notification behavior.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Notification Sound
                  </p>
                  <p className="text-sm text-zinc-500">
                    Play a sound when a new notification arrives
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("soundEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.soundEnabled ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.soundEnabled ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Debug & Test
              </h2>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Send a test notification to verify your settings.
              </p>
            </div>
            <button
              onClick={triggerTestNotification}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              Send Test
            </button>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
