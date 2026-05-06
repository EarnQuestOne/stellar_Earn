'use client';

import type { QuestWizardData } from '@/lib/schemas/quest.schema';
import {
  extractPlainTextFromHtml,
  formatWizardDateTime,
} from '@/lib/schemas/quest.schema';
import { sanitizeRichHtml } from '@/lib/utils/sanitize';

interface QuestPreviewProps {
  data: QuestWizardData;
  verifierAddress?: string | null;
}

const QuestPreview = ({ data, verifierAddress }: QuestPreviewProps) => {
  const hasDescription = Boolean(
    extractPlainTextFromHtml(data.basics.description)
  );
  const milestones = data.timeline.milestones.filter(
    (item) => item.title.trim() || item.dueDate.trim()
  );

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 pb-4 dark:border-zinc-700">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
            {data.basics.category}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {data.verification.mode === 'auto'
              ? 'Auto Verification'
              : 'Manual Review'}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {data.basics.title || 'Untitled Quest'}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {data.basics.shortDescription || 'No short description provided.'}
        </p>
      </header>

      <section className="mt-5 space-y-5">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Description
          </h4>
          {hasDescription ? (
            <div
              className="prose prose-sm mt-2 max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-200"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichHtml(data.basics.description),
              }}
            />
          ) : (
            <div className="prose prose-sm mt-2 max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-200">
              No full description provided yet.
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Reward</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {Number(data.reward.amount || 0).toLocaleString()}{' '}
              {data.reward.assetType}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              XP Reward
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {data.reward.xpReward} XP
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Deadline</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {data.timeline.deadline
                ? formatWizardDateTime(
                    data.timeline.deadline,
                    data.timeline.timezone
                  )
                : 'Not set'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.timeline.timezone}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Skills
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
              {data.requirements.skills.filter(Boolean).map((skill) => (
                <li key={skill}>• {skill}</li>
              ))}
              {data.requirements.skills.filter(Boolean).length === 0 && (
                <li>No skills listed.</li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Deliverables
            </h4>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
              {data.requirements.deliverables
                .filter((item) => item.title.trim())
                .map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700"
                  >
                    <p className="font-medium">{item.title}</p>
                    {item.details && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.details}
                      </p>
                    )}
                  </li>
                ))}
              {data.requirements.deliverables.filter((item) =>
                item.title.trim()
              ).length === 0 && <li>No deliverables listed.</li>}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Milestones
            </h4>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
              {milestones.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700"
                >
                  <p className="font-medium">
                    {item.title || 'Untitled milestone'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.dueDate
                      ? `${formatWizardDateTime(item.dueDate, data.timeline.timezone)} (${data.timeline.timezone})`
                      : 'Due date not set'}
                  </p>
                </li>
              ))}
              {milestones.length === 0 && <li>No milestones listed.</li>}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Verification
            </h4>
            <div className="mt-2 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="font-medium">
                  {data.verification.mode === 'auto'
                    ? 'Auto Verification'
                    : 'Manual Review'}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {data.verification.instructions ||
                    'No instructions provided.'}
                </p>
              </div>
              {data.verification.mode === 'auto' && (
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="font-medium">Automation Criteria</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {data.verification.autoCriteria || 'No criteria provided.'}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="font-medium">Verifier Address</p>
                <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                  {verifierAddress ||
                    'Connect a wallet or sign in to assign a verifier address.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
};

export default QuestPreview;
