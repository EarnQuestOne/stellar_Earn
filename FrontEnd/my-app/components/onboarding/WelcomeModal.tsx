"use client";

import { Modal } from "@/components/ui/Modal";

interface WelcomeModalProps {
  isOpen: boolean;
  tutorialMode: boolean;
  onTutorialModeChange: (enabled: boolean) => void;
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeModal({
  isOpen,
  tutorialMode,
  onTutorialModeChange,
  onStart,
  onSkip,
}: WelcomeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      title="Welcome to Stellar Earn"
      size="lg"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Get a quick walkthrough of key features so you can start completing
            quests and earning rewards faster.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>- Learn where to find quests and track submissions</li>
            <li>- See how to manage notifications and account settings</li>
            <li>- Understand where wallet actions happen</li>
          </ul>
        </div>

        <label className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Interactive tutorial mode
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Highlight features directly on the page while onboarding.
            </p>
          </div>
          <input
            type="checkbox"
            checked={tutorialMode}
            onChange={(event) => onTutorialModeChange(event.target.checked)}
            className="h-4 w-4 accent-[#089ec3]"
          />
        </label>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={onSkip}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
          >
            Skip for now
          </button>
          <button
            onClick={onStart}
            className="rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0ab8d4]"
          >
            Start tour
          </button>
        </div>
      </div>
    </Modal>
  );
}
