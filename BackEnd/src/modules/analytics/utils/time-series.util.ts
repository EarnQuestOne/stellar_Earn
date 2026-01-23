import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export class TimeSeriesUtil {
  /**
   * Aggregate data by time granularity using PostgreSQL DATE_TRUNC
   */
  static createTimeSeriesQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    dateColumn: string,
    granularity: 'day' | 'week' | 'month',
  ): SelectQueryBuilder<T> {
    const dateTruncFormat = granularity;

    return queryBuilder
      .select(`DATE_TRUNC('${dateTruncFormat}', ${dateColumn})`, 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`DATE_TRUNC('${dateTruncFormat}', ${dateColumn})`)
      .orderBy('date', 'ASC');
  }

  /**
   * Fill missing dates in time-series data with zero values
   */
  static fillMissingDates(
    data: any[],
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month',
  ): any[] {
    const result: any[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = data.find((d) => {
        const dataDate = new Date(d.date).toISOString().split('T')[0];
        return dataDate === dateStr;
      });

      result.push({
        date: dateStr,
        ...existingData,
        count: existingData?.count || 0,
      });

      // Increment by granularity
      if (granularity === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (granularity === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (granularity === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return result;
  }

  /**
   * Parse ISO date string to Date object with validation
   */
  static parseDate(dateStr: string): Date {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return date;
  }

  /**
   * Get default date range (last 30 days) if not provided
   */
  static getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return { startDate, endDate };
  }

  /**
   * Validate date range does not exceed maximum allowed days
   */
  static validateDateRange(
    startDate: Date,
    endDate: Date,
    maxDays: number = 365,
  ): void {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      throw new Error(`Date range cannot exceed ${maxDays} days`);
    }
  }
}
