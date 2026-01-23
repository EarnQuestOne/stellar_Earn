export class DateRangeUtil {
  /**
   * Parse and validate date range from query parameters
   * Returns default range (last 30 days) if not provided
   */
  static parseDateRange(
    startDate?: string,
    endDate?: string,
  ): { startDate: Date; endDate: Date } {
    if (!startDate || !endDate) {
      return this.getDefaultDateRange();
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new Error(`Invalid start date format: ${startDate}`);
    }

    if (isNaN(end.getTime())) {
      throw new Error(`Invalid end date format: ${endDate}`);
    }

    if (start > end) {
      throw new Error('Start date must be before or equal to end date');
    }

    return { startDate: start, endDate: end };
  }

  /**
   * Get default date range (last 30 days)
   */
  static getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of current day

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0); // Start of day 30 days ago

    return { startDate, endDate };
  }

  /**
   * Validate that date range does not exceed maximum allowed days
   */
  static validateMaxRange(
    startDate: Date,
    endDate: Date,
    maxDays: number = 365,
  ): void {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      throw new Error(
        `Date range cannot exceed ${maxDays} days. Requested range: ${diffDays} days`,
      );
    }
  }

  /**
   * Get the number of days between two dates
   */
  static getDaysDifference(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get start of day for a given date
   */
  static getStartOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Get end of day for a given date
   */
  static getEndOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }

  /**
   * Check if a date is within a range
   */
  static isDateInRange(
    date: Date,
    startDate: Date,
    endDate: Date,
  ): boolean {
    return date >= startDate && date <= endDate;
  }
}
