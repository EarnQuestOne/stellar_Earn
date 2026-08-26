import { getMetadataArgsStorage } from 'typeorm';
import { Payout } from '../../modules/payouts/entities/payout.entity';
import { AddPayoutStatusCreatedAtIndex1850000000001 } from './1850000000001-add-payout-status-created-at-index';

describe('Payout status and creation-time index', () => {
  it('declares the composite active-payout index in entity metadata', () => {
    const index = getMetadataArgsStorage().indices.find(
      (candidate) =>
        candidate.target === Payout &&
        candidate.name === 'idx_payout_status_created_at',
    );

    expect(index?.columns).toEqual(['status', 'createdAt']);
  });

  it('creates the composite index with the active-row predicate', async () => {
    const migration = new AddPayoutStatusCreatedAtIndex1850000000001();
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.up({ query } as never);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain(
      'CREATE INDEX IF NOT EXISTS "idx_payout_status_created_at"',
    );
    expect(query.mock.calls[0][0]).toContain(
      'ON "payouts" ("status", "createdAt")',
    );
    expect(query.mock.calls[0][0]).toContain('WHERE "deletedAt" IS NULL');
  });

  it('drops only the reconciliation index on rollback', async () => {
    const migration = new AddPayoutStatusCreatedAtIndex1850000000001();
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.down({ query } as never);

    expect(query).toHaveBeenCalledWith(
      'DROP INDEX IF EXISTS "idx_payout_status_created_at"',
    );
  });
});
