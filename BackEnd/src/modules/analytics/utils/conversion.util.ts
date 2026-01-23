import { Submission } from '../entities/submission.entity';

export class ConversionUtil {
  /**
   * Calculate approval rate as a percentage
   * @param approved Number of approved items
   * @param total Total number of items
   * @returns Approval rate (0-100) with 2 decimal places
   */
  static calculateApprovalRate(approved: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((approved / total) * 100 * 100) / 100;
  }

  /**
   * Calculate average time between two date fields
   * @param submissions Array of submissions
   * @param fromField Starting date field name
   * @param toField Ending date field name
   * @returns Average time in hours with 2 decimal places
   */
  static calculateAverageTime(
    submissions: Submission[],
    fromField: keyof Submission,
    toField: keyof Submission,
  ): number {
    const validSubmissions = submissions.filter(
      (s) => s[fromField] && s[toField],
    );

    if (validSubmissions.length === 0) return 0;

    const totalHours = validSubmissions.reduce((sum, submission) => {
      const from = submission[fromField] as Date;
      const to = submission[toField] as Date;
      const diff = to.getTime() - from.getTime();
      return sum + diff / (1000 * 60 * 60); // Convert to hours
    }, 0);

    return Math.round((totalHours / validSubmissions.length) * 100) / 100;
  }

  /**
   * Calculate retention rate as a percentage
   * @param totalUsers Total number of users
   * @param activeUsers Number of active users
   * @returns Retention rate (0-100) with 2 decimal places
   */
  static calculateRetentionRate(
    totalUsers: number,
    activeUsers: number,
  ): number {
    if (totalUsers === 0) return 0;
    return Math.round((activeUsers / totalUsers) * 100 * 100) / 100;
  }

  /**
   * Calculate conversion rate as a percentage
   * @param conversions Number of conversions
   * @param total Total number of opportunities
   * @returns Conversion rate (0-100) with 2 decimal places
   */
  static calculateConversionRate(
    conversions: number,
    total: number,
  ): number {
    if (total === 0) return 0;
    return Math.round((conversions / total) * 100 * 100) / 100;
  }

  /**
   * Calculate average value from an array of numbers
   * @param values Array of numbers
   * @returns Average with 2 decimal places
   */
  static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  /**
   * Sum bigint string values
   * @param values Array of bigint string values
   * @returns Total as string
   */
  static sumBigIntStrings(values: string[]): string {
    return values
      .reduce((sum, value) => sum + BigInt(value || '0'), BigInt(0))
      .toString();
  }

  /**
   * Round a number to specified decimal places
   * @param value Number to round
   * @param decimals Number of decimal places
   * @returns Rounded number
   */
  static round(value: number, decimals: number = 2): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
}
