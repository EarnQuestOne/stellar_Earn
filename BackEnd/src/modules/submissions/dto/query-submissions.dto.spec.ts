import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  QuerySubmissionsDto,
  SortOrder,
  SubmissionSortBy,
  SubmissionStatus,
} from './query-submissions.dto';

describe('QuerySubmissionsDto', () => {
  const getErrors = async (query: Record<string, unknown>) =>
    validate(plainToInstance(QuerySubmissionsDto, query));

  it('applies the documented defaults for limit, sort, and order', () => {
    const query = plainToInstance(QuerySubmissionsDto, {});

    expect(query.limit).toBe(10);
    expect(query.sortBy).toBe(SubmissionSortBy.CREATED_AT);
    expect(query.order).toBe(SortOrder.DESC);
  });

  it.each(['0', '-1', '101', '1.5', 'not-a-number'])(
    'rejects an invalid limit: %s',
    async (limit) => {
      const errors = await getErrors({ limit });

      expect(errors.some((error) => error.property === 'limit')).toBe(true);
    },
  );

  it('accepts a numeric limit at both boundaries', async () => {
    await expect(getErrors({ limit: '1' })).resolves.toHaveLength(0);
    await expect(getErrors({ limit: '100' })).resolves.toHaveLength(0);
  });

  it('rejects unknown status and sort values', async () => {
    const errors = await getErrors({ status: 'UNKNOWN', sortBy: 'title' });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['status', 'sortBy']),
    );
  });

  it('accepts the supported status, sort, and order values', async () => {
    const errors = await getErrors({
      status: SubmissionStatus.APPROVED,
      sortBy: SubmissionSortBy.UPDATED_AT,
      order: SortOrder.ASC,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed user ID before it reaches the repository query', async () => {
    const errors = await getErrors({ userId: 'user-1' });

    expect(errors.some((error) => error.property === 'userId')).toBe(true);
  });

  it('accepts a UUID user ID', async () => {
    const errors = await getErrors({
      userId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(errors).toHaveLength(0);
  });
});
