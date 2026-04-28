'use client';

interface ConfirmationStepProps {
  submitted: boolean;
  questTitle: string;
  error: string | null;
}

const ConfirmationStep = ({
  submitted,
  questTitle,
  error,
}: ConfirmationStepProps) => {
  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        data-testid="step-confirmation"
      >
        <p className="font-semibold">Quest publishing failed</p>
        <p className="mt-1">{error}</p>
      </section>
    );
  }

  if (!submitted) {
    return (
      <section
        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        data-testid="step-confirmation"
      >
        Confirmation appears here after you publish.
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"
      data-testid="step-confirmation"
    >
      <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
        Quest created successfully
      </h3>
      <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
        {questTitle || 'Your quest'} is now saved. You can return to the quest
        board and manage status from admin pages.
      </p>
    </section>
  );
};

export default ConfirmationStep;
