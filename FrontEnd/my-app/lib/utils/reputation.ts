import type { XPProgress } from '@/lib/types/reputation';

/**
 * Calculate total XP required to reach a specific level
 * Uses exponential growth: XP = baseXP * (level ^ 1.5)
 */
export function calculateXPForLevel(level: number): number {
  const baseXP = 100;
  return Math.floor(baseXP * Math.pow(level, 1.5));
}

/**
 * Calculate the level from total XP
 */
export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < 100) return 1;

  let level = 1;
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Get XP progress information for current level
 */
export function getXPProgress(currentXP: number, level: number): XPProgress {
  const xpForCurrentLevel = calculateXPForLevel(level);
  const xpForNextLevel = calculateXPForLevel(level + 1);
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  const percentage = Math.min(
    100,
    Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100)
  );

  return {
    current: xpInCurrentLevel,
    needed: xpNeededForNextLevel,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Format reputation score with commas
 */
export function formatReputationScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Get level title/rank name based on level
 */
export function getLevelTitle(level: number): string {
  if (level < 5) return 'Novice';
  if (level < 10) return 'Apprentice';
  if (level < 20) return 'Explorer';
  if (level < 30) return 'Veteran';
  if (level < 50) return 'Master';
  if (level < 75) return 'Elite';
  if (level < 100) return 'Legend';
  return 'Mythic';
}

/**
 * Check if a level should show glow effect
 */
export function shouldShowGlow(level: number): boolean {
  return (
    level >= 10 && (level % 10 === 0 || level % 25 === 0 || level % 50 === 0)
  );
}
