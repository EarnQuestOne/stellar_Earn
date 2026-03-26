'use client';

import { memo} from 'react';
import type { Quest } from '@/lib/types/quest';
import { QuestDifficulty } from '@/lib/types/quest';

interface QuestCardProps {
  quest: Quest;
  onClick?: (quest: Quest) => void;
  progress?: number;
}

function formatTimeRemaining(deadline?: string): string | null {
  if (!deadline) return null;
  const days = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return 'Expired';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
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
  '#7c3aed', '#0ea5e9', '#f97316',
  '#0d9488', '#eab308', '#ec4899',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length];
}

export const QuestCard = memo(({ quest, onClick, progress }: QuestCardProps) => {
  const timeLabel = formatTimeRemaining(quest.deadline);
  const isUrgent = timeLabel && !['Expired', 'Today'].includes(timeLabel)
    ? parseInt(timeLabel) <= 3
    : false;

  const handleClick = () => onClick?.(quest);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View quest: ${quest.title}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
      }}
      className="quest-card"
    >
      <div className="quest-card__top">
        <span className={`quest-card__cat ${categoryStyles[quest.category] ?? 'quest-card__cat--default'}`}>
          {quest.category}
        </span>
        <span className={`quest-card__diff ${difficultyStyles[quest.difficulty]}`}>
          {quest.difficulty}
        </span>
      </div>

      <h3 className="quest-card__title">{quest.title}</h3>

      <p className="quest-card__desc">{quest.description}</p>

      {quest.skills && quest.skills.length > 0 && (
        <div className="quest-card__skills">
          {quest.skills.map((skill: string) => (
            <span key={skill} className="quest-card__skill-tag">{skill}</span>
          ))}
        </div>
      )}

      {progress !== undefined && (
        <div className="quest-card__progress">
          <div className="quest-card__progress-labels">
            <span>Progress</span>
            <span className="quest-card__progress-pct">{progress}%</span>
          </div>
          <div className="quest-card__progress-track">
            <div
              className="quest-card__progress-fill"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      <div className="quest-card__spacer" />

      <div className="quest-card__meta">
        <div className="quest-card__rewards">
          <span className="quest-card__reward quest-card__reward--xlm">
            <svg className="quest-card__reward-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
            </svg>
            {quest.rewardAmount} {quest.rewardAsset}
          </span>

          <span className="quest-card__reward quest-card__reward--xp">
            <svg className="quest-card__reward-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            +{quest.xpReward} XP
          </span>
        </div>

        {timeLabel && (
          <span className={`quest-card__time ${isUrgent ? 'quest-card__time--urgent' : ''}`}>
            <svg className="quest-card__reward-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {timeLabel}
          </span>
        )}
      </div>

      <div className="quest-card__footer">
        {quest.creator && (
          <div className="quest-card__creator">
            <span
              className="quest-card__avatar"
              style={{ backgroundColor: avatarColor(quest.creator.name) }}
              aria-hidden="true"
            >
              {quest.creator.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="quest-card__creator-name">{quest.creator.name}</span>
          </div>
        )}

        <span className="quest-card__view-link">
          View Quest
          <svg className="quest-card__view-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </span>
      </div>

      <button
        className="quest-card__quick-apply"
        onClick={(e) => { e.stopPropagation(); onClick?.(quest); }}
        aria-label={`Quick apply for ${quest.title}`}
      >
        Quick Apply →
      </button>
    </div>
  );
});

QuestCard.displayName = 'QuestCard';