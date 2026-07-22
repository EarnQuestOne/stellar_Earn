'use client';

import React, { memo, useState, useEffect } from 'react';
import type { Quest } from '@/lib/types/quest';
import { QuestDifficulty } from '@/lib/types/quest';

import { useFormatter } from '@/lib/hooks/useFormatter';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useQuestSocket } from '@/lib/hooks/useQuestSocket';

interface QuestCardProps {
  quest: Quest;
  onClick?: (quest: Quest) => void;
  progress?: number;
}

// ─── Removed: formatTimeRemaining() ───────────────────────────────────────────
// Previously a hand-rolled English-only function that:
//   - Could not handle locale differences (e.g. "2 days left" only in English)
//   - Used brittle parseInt() on its own output to detect urgency
//   - Didn't handle timezones
// Now replaced by formatDeadline() from our i18n-formatters via useFormatter().
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when a deadline is within the next 3 days (and not yet expired).
 * Previously this was done via `parseInt(timeLabel) <= 3` which broke for any
 * non-English locale where the label string has a different shape.
 * Now we compare raw ms directly — locale-independent and reliable.
 */
function isDeadlineUrgent(deadline?: string | null): boolean {
  if (!deadline) return false;
  const deadlineMs = new Date(deadline).getTime();
  if (isNaN(deadlineMs)) return false;
  const diffDays = (deadlineMs - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

const difficultyStyles: Record<QuestDifficulty, string> = {
  [QuestDifficulty.EASY]: 'quest-card__diff--easy',
  [QuestDifficulty.MEDIUM]: 'quest-card__diff--medium',
  [QuestDifficulty.HARD]: 'quest-card__diff--hard',
};

const categoryStyles: Record<string, string> = {
  Security: 'quest-card__cat--security',
  Frontend: 'quest-card__cat--frontend',
  Backend: 'quest-card__cat--backend',
  Docs: 'quest-card__cat--docs',
  Testing: 'quest-card__cat--testing',
  Community: 'quest-card__cat--community',
};

const AVATAR_BG = [
  '#7c3aed',
  '#0ea5e9',
  '#f97316',
  '#0d9488',
  '#eab308',
  '#ec4899',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length];
}

export const QuestCard = memo(
  ({ quest, onClick, progress }: QuestCardProps) => {
    const [localQuest, setLocalQuest] = useState<Quest>(quest);

    useEffect(() => {
      setLocalQuest(quest);
    }, [quest]);

    useQuestSocket({
      questId: localQuest.id,
      onQuestUpdated: (event) => {
        if (event.questId === localQuest.id) {
          import('@/lib/api/quests').then(({ getQuestById }) => {
            getQuestById(localQuest.id).then((updatedQuest) => {
              setLocalQuest(updatedQuest as Quest);
            });
          });
        }
      },
    });

    // useFormatter reads navigator.language once and returns pre-bound,
    // memoised formatting functions — no locale prop drilling needed.
    const { deadline, reward, compactReward } = useFormatter();

    // Localised deadline label: "Ends in 3 days" | "Expired" | null
    const timeLabel = localQuest.deadline
      ? deadline(localQuest.deadline)
      : null;

    // Urgency check is now locale-independent (raw ms comparison)
    const isUrgent = isDeadlineUrgent(localQuest.deadline);

    const handleClick = () => onClick?.(localQuest);

    // ── Accessible card label ────────────────────────────────────────────────
    // Previously: raw `${quest.rewardAmount} ${quest.rewardAsset}` interpolation
    // Now: uses formatReward so screen readers announce "500 XLM" not "500xlm"
    // and the number is formatted with locale-correct separators.
    const formattedRewardAmount = reward(localQuest.rewardAmount, {
      type: 'custom',
      label: {
        singular: localQuest.rewardAsset ?? 'token',
        plural: localQuest.rewardAsset ?? 'tokens',
      },
    });

    const rewardLabel = `${formattedRewardAmount} and ${localQuest.xpReward} XP`;
    const timeInfo = timeLabel ? `, deadline: ${timeLabel}` : '';
    const cardLabel = `${localQuest.title}. Category: ${localQuest.category ?? 'Uncategorized'}, Difficulty: ${localQuest.difficulty}, Reward: ${rewardLabel}${timeInfo}`;

    // ── Compact reward for the badge in tight card space ────────────────────
    // Previously: `{quest.rewardAmount} {quest.rewardAsset}` — no number formatting
    // Now: "1.2K XLM" for large values, "500 XLM" for normal values, all
    //      with locale-correct digit grouping.
    const compactRewardLabel = compactReward(localQuest.rewardAmount, {
      type: 'custom',
      label: {
        singular: localQuest.rewardAsset ?? 'token',
        plural: localQuest.rewardAsset ?? 'tokens',
      },
    });

    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={cardLabel}
        className="quest-card"
      >
        <div className="quest-card__top" aria-hidden="true">
          <span
            className={`quest-card__cat ${categoryStyles[localQuest.category ?? ''] ?? 'quest-card__cat--default'}`}
          >
            {localQuest.category}
          </span>
          <span
            className={`quest-card__diff ${localQuest.difficulty ? difficultyStyles[localQuest.difficulty] : ''}`}
          >
            {localQuest.difficulty}
          </span>
        </div>

        <h3 className="quest-card__title">{localQuest.title}</h3>

        <p className="quest-card__desc">{localQuest.description}</p>

        {localQuest.skills && localQuest.skills.length > 0 && (
          <div
            className="quest-card__skills"
            aria-label={`Required skills: ${localQuest.skills.join(', ')}`}
          >
            {localQuest.skills.map((skill: string, index: number) => (
              <span
                key={`${localQuest.id}-skill-${skill}-${index}`}
                className="quest-card__skill-tag"
                aria-hidden="true"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {progress !== undefined && (
          <div className="quest-card__progress">
            <div className="quest-card__progress-labels" aria-hidden="true">
              <span>Progress</span>
              <span className="quest-card__progress-pct">{progress}%</span>
            </div>
            <div className="quest-card__progress-track" aria-hidden="true">
              <div
                className="quest-card__progress-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Quest progress: ${progress}%`}
              />
            </div>
          </div>
        )}

        <div className="quest-card__spacer" aria-hidden="true" />

        <div className="quest-card__meta" aria-hidden="true">
          <div className="quest-card__rewards">
            {/* ── XLM reward badge ─────────────────────────────────────────
                Before: {quest.rewardAmount} {quest.rewardAsset}
                  → No number formatting, no locale awareness
                  → "1200 XLM" regardless of user locale

                After:  {compactRewardLabel}
                  → "1.2K XLM" for large values (compact badge-friendly)
                  → "500 XLM" for normal values
                  → Locale-correct digit grouping in all cases
            ────────────────────────────────────────────────────────────── */}
            <span className="quest-card__reward quest-card__reward--xlm">
              <svg
                className="quest-card__reward-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clipRule="evenodd"
                />
              </svg>
              {compactRewardLabel}
            </span>

            <span className="quest-card__reward quest-card__reward--xp">
              <svg
                className="quest-card__reward-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              +{localQuest.xpReward} XP
            </span>
          </div>

          {/* ── Deadline badge ─────────────────────────────────────────────
              Before: formatTimeRemaining() — English-only, brittle urgency
                → "3 days left" always in English
                → isUrgent relied on parseInt() of its own English output

              After: deadline() from useFormatter()
                → "Ends in 3 days" / "Se termine dans 3 jours" / etc.
                → isUrgent uses raw ms comparison, locale-independent
          ─────────────────────────────────────────────────────────────── */}
          {timeLabel && (
            <span
              className={`quest-card__time ${isUrgent ? 'quest-card__time--urgent' : ''}`}
            >
              <svg
                className="quest-card__reward-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {timeLabel}
            </span>
          )}
        </div>

        <div className="quest-card__footer" aria-hidden="true">
          {localQuest.creator && (
            <div className="quest-card__creator">
              {localQuest.creator.avatarUrl ? (
                <OptimizedImage
                  src={localQuest.creator.avatarUrl}
                  alt=""
                  width={22}
                  height={22}
                  containerClassName="quest-card__avatar quest-card__avatar--img"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="quest-card__avatar"
                  style={{
                    backgroundColor: avatarColor(
                      localQuest.creator.name || 'Unknown'
                    ),
                  }}
                  aria-hidden="true"
                >
                  {(localQuest.creator.name || 'UN').slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="quest-card__creator-name">
                {localQuest.creator.name || 'Unknown Creator'}
              </span>
            </div>
          )}

          <span className="quest-card__view-link">
            View Quest
            <svg
              className="quest-card__view-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>

        <button
          className="quest-card__quick-apply"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(localQuest);
          }}
          aria-label={`Quick apply for ${localQuest.title}`}
          tabIndex={-1}
        >
          Quick Apply →
        </button>
      </button>
    );
  }
);

QuestCard.displayName = 'QuestCard';
