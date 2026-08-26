import { ForbiddenException } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputeStatus } from './entities/dispute.entity';

describe('DisputesService', () => {
  const actor = { id: 'user-1', stellarAddress: 'GUSER', role: 'USER' };
  const dispute = {
    id: 'dispute-1',
    questId: 'task-1',
    submissionId: 'submission-1',
    initiatorAddress: 'GUSER',
    arbitratorAddress: 'GARBITRATOR',
    status: DisputeStatus.PENDING,
  } as any;

  it('rejects opening a dispute for another participant', async () => {
    const service = new DisputesService(
      { create: jest.fn(), save: jest.fn() } as any,
      {
        findOne: jest.fn().mockResolvedValue({
          id: 'submission-1',
          status: 'REJECTED',
          user: { id: 'someone-else', stellarAddress: 'GOTHER' },
          quest: { contractTaskId: 'task-1' },
        }),
      } as any,
      { openDispute: jest.fn() } as any,
    );

    await expect(
      service.open(
        { submissionId: 'submission-1', arbitratorAddress: 'GARBITRATOR' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('persists an opened dispute after the chain transaction succeeds', async () => {
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve({ id: 'dispute-1', ...value })),
    };
    const stellar = {
      openDispute: jest.fn().mockResolvedValue({ hash: 'tx-open' }),
    };
    const service = new DisputesService(
      repository as any,
      {
        findOne: jest.fn().mockResolvedValue({
          id: 'submission-1',
          status: 'REJECTED',
          user: { id: actor.id, stellarAddress: actor.stellarAddress },
          quest: { contractTaskId: 'task-1' },
        }),
      } as any,
      stellar as any,
    );

    const result = await service.open(
      { submissionId: 'submission-1', arbitratorAddress: 'GARBITRATOR' },
      actor,
    );

    expect(stellar.openDispute).toHaveBeenCalledWith(
      'task-1',
      'GUSER',
      'GARBITRATOR',
    );
    expect(result.openTransactionHash).toBe('tx-open');
    expect(result.status).toBe(DisputeStatus.PENDING);
  });

  it('allows only the assigned arbitrator or admin to resolve', async () => {
    const service = new DisputesService(
      { findOne: jest.fn().mockResolvedValue(dispute) } as any,
      {} as any,
      { resolveDispute: jest.fn() } as any,
    );

    await expect(
      service.resolve('dispute-1', { upheld: true }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});