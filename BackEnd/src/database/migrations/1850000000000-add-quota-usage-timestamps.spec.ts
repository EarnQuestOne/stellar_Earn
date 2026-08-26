import { getMetadataArgsStorage } from 'typeorm';
import { QuotaUsage } from '../../modules/quota/entities/quota-usage.entity';
import { AddQuotaUsageTimestamps1850000000000 } from './1850000000000-add-quota-usage-timestamps';

describe('Quota usage timestamps', () => {
  it('declares createdAt and updatedAt as managed timestamp columns', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === QuotaUsage,
    );

    expect(
      columns.find((column) => column.propertyName === 'createdAt')?.mode,
    ).toBe('createDate');
    expect(
      columns.find((column) => column.propertyName === 'updatedAt')?.mode,
    ).toBe('updateDate');
  });

  it('adds both timestamp columns with defaults for existing rows', async () => {
    const migration = new AddQuotaUsageTimestamps1850000000000();
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.up({ query } as never);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain(
      'ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()',
    );
    expect(query.mock.calls[1][0]).toContain(
      'ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()',
    );
  });

  it('removes only the timestamp columns on rollback', async () => {
    const migration = new AddQuotaUsageTimestamps1850000000000();
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.down({ query } as never);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DROP COLUMN IF EXISTS "updatedAt"'),
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DROP COLUMN IF EXISTS "createdAt"'),
    );
  });
});
