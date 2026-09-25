import { QuestAlreadyExistsException } from '../../common/exceptions/app.exceptions';
import { CacheService } from '../cache/cache.service';
import { ModerationService } from '../moderation/moderation.service';
import { QuotaService } from '../quota/quota.service';
import { QuestsService } from './quests.service';

const createService = () => {
  const repository = {
    create: jest.fn().mockReturnValue({
      id: 'existing-quest-id',
      title: 'Duplicate quest',
      description: 'A quest with enough description text',
      rewardAmount: 10,
      createdBy: 'GABC',
    }),
    save: jest.fn(),
  };
  const cache = { deletePattern: jest.fn().mockResolvedValue(undefined) };
  const eventEmitter = { emit: jest.fn() };
  const moderation = {
    scanText: jest.fn().mockResolvedValue({
      shouldBlock: false,
      keywordHits: [],
    }),
    saveQuestModerationItem: jest.fn().mockResolvedValue(undefined),
  };
  const quota = {
    enforceQuestCreationQuota: jest.fn().mockResolvedValue(undefined),
  };

  const service = new QuestsService(
    repository as any,
    cache as unknown as CacheService,
    eventEmitter as any,
    moderation as unknown as ModerationService,
    quota as unknown as QuotaService,
  );

  return { service, repository };
};

describe('QuestsService duplicate quest handling', () => {
  it('translates PostgreSQL duplicate-key errors into HTTP 409', async () => {
    const { service, repository } = createService();
    const duplicateError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    repository.save.mockRejectedValue(duplicateError);

    const promise = service.create(
      {
        title: 'Duplicate quest',
        description: 'A quest with enough description text',
        rewardAmount: 10,
      } as any,
      'GABC',
    );

    try {
      await promise;
      throw new Error('Expected quest creation to reject');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(QuestAlreadyExistsException);
      const exception = error as QuestAlreadyExistsException;
      expect(exception.getStatus()).toBe(409);
      expect(exception.getResponse()).toBe(
        "Quest 'existing-quest-id' already exists",
      );
    }
  });

  it('translates wrapped TypeORM PostgreSQL errors into HTTP 409', async () => {
    const { service, repository } = createService();
    repository.save.mockRejectedValue({
      driverError: { code: '23505' },
    });

    await expect(
      service.create(
        {
          title: 'Duplicate quest',
          description: 'A quest with enough description text',
          rewardAmount: 10,
        } as any,
        'GABC',
      ),
    ).rejects.toBeInstanceOf(QuestAlreadyExistsException);
  });

  it('preserves non-duplicate database errors', async () => {
    const { service, repository } = createService();
    const databaseError = new Error('database unavailable');
    repository.save.mockRejectedValue(databaseError);

    await expect(
      service.create(
        {
          title: 'Quest',
          description: 'A quest with enough description text',
          rewardAmount: 10,
        } as any,
        'GABC',
      ),
    ).rejects.toBe(databaseError);
  });
});
