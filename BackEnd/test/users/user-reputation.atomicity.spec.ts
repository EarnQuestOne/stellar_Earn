import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../../src/modules/users/users.service';
import { User } from '../../src/modules/users/entities/user.entity';
import { EventStore } from '../../src/events/entities/event-store.entity';

describe('UsersService reputation atomicity', () => {
  let service: UsersService;
  let usersRepository: any;
  let txRepo: any;
  let eventTxRepo: any;

  const buildUser = (overrides: Partial<User> = {}): User => {
    const user = new User();
    user.id = overrides.id ?? 'user-1';
    user.xp = overrides.xp ?? 100;
    user.level = overrides.level ?? 2;
    user.username = 'tester';
    user.email = 'tester@example.com';
    user.stellarAddress =
      'GTESTADDRESS1234567890TESTADDRESS1234567890TESTADDRESS12';
    user.calculateLevel = function calculateLevel() {
      return Math.max(1, Math.floor(Math.sqrt(this.xp / 100)));
    };
    return Object.assign(user, overrides);
  };

  beforeEach(async () => {
    txRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    eventTxRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn(),
    };

    usersRepository = {
      manager: {
        transaction: jest.fn(async (cb: any) =>
          cb({
            getRepository: (entity: any) =>
              entity === User ? txRepo : eventTxRepo,
          }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('applies XP delta atomically and returns old/new reputation state', async () => {
    const user = buildUser({ xp: 400, level: 2 });
    txRepo.findOne.mockResolvedValue(user);
    txRepo.save.mockResolvedValue(user);

    const result = await service.applyReputationDeltaAtomic(user.id, 100);

    expect(usersRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(txRepo.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
    expect(txRepo.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        userId: user.id,
        oldXp: 400,
        newXp: 500,
        oldLevel: 2,
        newLevel: 2,
        deltaXp: 100,
      }),
    );
  });

  it('fails transaction when user does not exist', async () => {
    txRepo.findOne.mockResolvedValue(null);

    await expect(
      service.applyReputationDeltaAtomic('missing-user', 100),
    ).rejects.toThrow(NotFoundException);
    expect(txRepo.save).not.toHaveBeenCalled();
  });

  it('reverts reputation atomically to previous values', async () => {
    const user = buildUser({ xp: 900, level: 3 });
    txRepo.findOne.mockResolvedValue(user);
    txRepo.save.mockResolvedValue(user);

    await service.revertReputationAtomic(user.id, 500, 2);

    expect(usersRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(txRepo.save).toHaveBeenCalledTimes(1);
    expect(user.xp).toBe(500);
    expect(user.level).toBe(2);
  });

  it('runs cross-service side effects inside the same transaction', async () => {
    const user = buildUser({ xp: 400, level: 2 });
    txRepo.findOne.mockResolvedValue(user);
    txRepo.save.mockResolvedValue(user);
    eventTxRepo.save.mockResolvedValue({ id: 'evt-1' });

    const result = await service.applyReputationDeltaAtomic(user.id, 100, {
      persist: async (manager, update) => {
        const repo = manager.getRepository(EventStore);
        await repo.save(
          repo.create({
            eventName: 'user.reputation-changed',
            payload: {
              userId: update.userId,
              oldXp: update.oldXp,
              newXp: update.newXp,
            },
          }),
        );
      },
    });

    expect(result.newXp).toBe(500);
    expect(eventTxRepo.save).toHaveBeenCalledTimes(1);
  });

  it('aborts the transaction when a cross-service side effect fails', async () => {
    const user = buildUser({ xp: 400, level: 2 });
    txRepo.findOne.mockResolvedValue(user);
    txRepo.save.mockResolvedValue(user);
    eventTxRepo.save.mockRejectedValue(new Error('event store down'));

    await expect(
      service.applyReputationDeltaAtomic(user.id, 100, {
        persist: async (manager) => {
          const repo = manager.getRepository(EventStore);
          await repo.save(
            repo.create({ eventName: 'user.reputation-changed', payload: {} }),
          );
        },
      }),
    ).rejects.toThrow('event store down');
  });
});
