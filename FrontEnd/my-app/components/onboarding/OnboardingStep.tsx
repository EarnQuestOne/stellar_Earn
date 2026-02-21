"use client";

interface OnboardingStepProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

function ProgressIndicator({ progress }: { progress: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
      <div
        className="h-full rounded-full bg-[#089ec3] transition-all duration-200"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function OnboardingStep({
  title,
  description,
  currentStep,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
  onSkip,
  onComplete,
}: OnboardingStepProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#089ec3]">
        Step {currentStep} of {totalSteps}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {description}
      </p>

      <div className="mt-4">
        <ProgressIndicator progress={progress} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={onSkip}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Skip
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={isFirstStep}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
          >
            Back
          </button>
          {isLastStep ? (
            <button
              onClick={onComplete}
              className="rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0ab8d4]"
            >
              Complete
            </button>
          ) : (
            <button
              onClick={onNext}
              className="rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0ab8d4]"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
