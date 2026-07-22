import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserExperienceListener } from '../../src/modules/users/events/user-experience.listener';
import { UsersService } from '../../src/modules/users/users.service';
import { EventStore } from '../../src/events/entities/event-store.entity';

describe('UserExperienceListener atomicity across service boundaries', () => {
  let listener: UserExperienceListener;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let userService: jest.Mocked<
    Pick<UsersService, 'applyReputationDeltaAtomic'>
  >;

  const approvedEvent = {
    submissionId: 'sub-1',
    questId: 'quest-1',
    userId: 'user-1',
    approvedBy: 'admin-1',
    approvedAt: new Date(),
  };

  beforeEach(() => {
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    userService = {
      applyReputationDeltaAtomic: jest.fn(),
    };

    listener = new UserExperienceListener(
      eventEmitter,
      userService as unknown as UsersService,
    );
  });

  it('updates reputation and emits both reputation + level-up events on level change', async () => {
    const eventRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => value),
    };

    userService.applyReputationDeltaAtomic.mockResolvedValue({
      userId: approvedEvent.userId,
      oldXp: 100,
      newXp: 400,
      oldLevel: 1,
      newLevel: 2,
      deltaXp: 300,
    });

    userService.applyReputationDeltaAtomic.mockImplementation(
      async (_userId, _delta, sideEffects) => {
        const update = {
          userId: approvedEvent.userId,
          oldXp: 100,
          newXp: 400,
          oldLevel: 1,
          newLevel: 2,
          deltaXp: 300,
        };
        await sideEffects?.persist?.(
          {
            getRepository: (entity: any) => {
              expect(entity).toBe(EventStore);
              return eventRepo;
            },
          } as any,
          update,
        );
        return update;
      },
    );

    await listener.handleSubmissionApproved(approvedEvent);

    expect(userService.applyReputationDeltaAtomic).toHaveBeenCalledWith(
      approvedEvent.userId,
      100,
      expect.objectContaining({ persist: expect.any(Function) }),
    );

    expect(eventRepo.save).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'user.reputation-changed',
      expect.objectContaining({
        userId: approvedEvent.userId,
        oldReputation: 100,
        newReputation: 400,
        reason: 'submission.approved',
      }),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'user.level-up',
      expect.objectContaining({
        userId: approvedEvent.userId,
        oldLevel: 1,
        newLevel: 2,
      }),
    );
  });

  it('does not emit level-up when level is unchanged', async () => {
    const eventRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => value),
    };

    userService.applyReputationDeltaAtomic.mockResolvedValue({
      userId: approvedEvent.userId,
      oldXp: 200,
      newXp: 300,
      oldLevel: 2,
      newLevel: 2,
      deltaXp: 100,
    });

    userService.applyReputationDeltaAtomic.mockImplementation(
      async (_userId, _delta, sideEffects) => {
        const update = {
          userId: approvedEvent.userId,
          oldXp: 200,
          newXp: 300,
          oldLevel: 2,
          newLevel: 2,
          deltaXp: 100,
        };
        await sideEffects?.persist?.(
          {
            getRepository: () => eventRepo,
          } as any,
          update,
        );
        return update;
      },
    );

    await listener.handleSubmissionApproved(approvedEvent);

    expect(eventRepo.save).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'user.reputation-changed',
      expect.objectContaining({
        userId: approvedEvent.userId,
        oldReputation: 200,
        newReputation: 300,
      }),
    );
  });

  it('does not emit any event if reputation update fails', async () => {
    userService.applyReputationDeltaAtomic.mockRejectedValue(
      new Error('db transaction failed'),
    );

    await expect(
      listener.handleSubmissionApproved(approvedEvent),
    ).rejects.toThrow('db transaction failed');

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('does not fail the workflow if downstream fan-out throws (persistence already happened)', async () => {
    const eventRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => value),
    };

    userService.applyReputationDeltaAtomic.mockImplementation(
      async (_userId, _delta, sideEffects) => {
        const update = {
          userId: approvedEvent.userId,
          oldXp: 250,
          newXp: 350,
          oldLevel: 2,
          newLevel: 3,
          deltaXp: 100,
        };
        await sideEffects?.persist?.(
          {
            getRepository: () => eventRepo,
          } as any,
          update,
        );
        return update;
      },
    );

    eventEmitter.emit.mockImplementation((eventName: string) => {
      if (eventName === 'user.level-up') {
        throw new Error('event bus unavailable');
      }
      return true;
    });

    await expect(
      listener.handleSubmissionApproved(approvedEvent),
    ).resolves.toBeUndefined();
    expect(eventRepo.save).toHaveBeenCalledTimes(2);
  });
});
