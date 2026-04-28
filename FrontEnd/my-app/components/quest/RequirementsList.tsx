'use client';

interface RequirementsListProps {
  requirements?: string[];
  description: string;
}

export function RequirementsList({
  requirements,
  description,
}: RequirementsListProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Quest Details
      </h3>

      {/* Description */}
      <div className="mb-6">
        <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </h4>
        <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      {/* Requirements */}
      {requirements && requirements.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Requirements
          </h4>
          <ul className="space-y-2">
            {requirements.map((requirement, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#089ec3]/10">
                  <svg
                    className="h-3 w-3 text-[#089ec3]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {requirement}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
