'use client';

import { useLocale } from 'next-intl';
import {
  formatDate,
  formatReward,
  type DateFormatOptions,
  type RewardFormatOptions,
} from '@/lib/utils/i18n-formatters';

/**
 * Hook that provides date and number formatting utilities
 * automatically using the current locale from next-intl
 */
export function useI18nFormatters() {
  const currentLocale = useLocale();

  /**
   * Format a date with the current locale
   */
  const formatDateWithLocale = (
    value: Date | number | string,
    options?: Omit<DateFormatOptions, 'locale'>
  ) => {
    return formatDate(value, {
      ...options,
      locale: currentLocale,
    });
  };

  /**
   * Format a reward with the current locale
   */
  const formatRewardWithLocale = (
    value: number,
    options: Omit<RewardFormatOptions, 'locale'>
  ) => {
    return formatReward(value, {
      ...options,
      locale: currentLocale,
    });
  };

  return {
    formatDate: formatDateWithLocale,
    formatReward: formatRewardWithLocale,
    currentLocale,
  };
}
