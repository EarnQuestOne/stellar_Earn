import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebsocketService } from './websocket.service';
import { WsSubscription, WsChannel } from './entities/ws-subscription.entity';
import { WsMessage } from './entities/ws-message.entity';

describe('WebsocketService', () => {
  let service: WebsocketService;

  const mockSubscriptionRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'sub-1', ...entity })),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockSocket: any = {
    id: 'socket-1',
    data: {
      user: { id: 'user-1', stellarAddress: 'GABCDEF...', role: 'USER' },
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
  };

  const mockServer: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketService,
        { provide: getRepositoryToken(WsSubscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(WsMessage), useValue: mockMessageRepo },
      ],
    }).compile();

    service = module.get<WebsocketService>(WebsocketService);
    service.setServer(mockServer);
  });

  afterEach(() => jest.clearAllMocks());

  describe('connection management', () => {
    it('should register a client', () => {
      service.registerClient(mockSocket);
      expect(service.getConnectionCount()).toBe(1);
      expect(service.getConnectedUserCount()).toBe(1);
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
    });

    it('should remove a client', () => {
      service.registerClient(mockSocket);
      service.removeClient('socket-1');
      expect(service.getConnectionCount()).toBe(0);
      expect(service.getConnectedUserCount()).toBe(0);
    });

    it('should handle removing non-existent client', () => {
      expect(() => service.removeClient('non-existent')).not.toThrow();
    });

    it('should track multiple sockets for same user', () => {
      const socket2: any = {
        ...mockSocket,
        id: 'socket-2',
        data: { user: { id: 'user-1', stellarAddress: 'GABCDEF...', role: 'USER' } },
        join: jest.fn(),
      };
      service.registerClient(mockSocket);
      service.registerClient(socket2);
      expect(service.getConnectionCount()).toBe(2);
      expect(service.getConnectedUserCount()).toBe(1);
    });
  });

  describe('subscriptions', () => {
    beforeEach(() => {
      service.registerClient(mockSocket);
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
    });

    it('should subscribe to a channel', async () => {
      const result = await service.subscribe('socket-1', WsChannel.QUEST_NEW);
      expect(result.success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith(WsChannel.QUEST_NEW);
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
    });

    it('should subscribe with resource ID', async () => {
      const result = await service.subscribe('socket-1', WsChannel.SUBMISSION_STATUS, 'quest-123');
      expect(result.success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith(`${WsChannel.SUBMISSION_STATUS}:quest-123`);
    });

    it('should unsubscribe from a channel', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue({ id: 'sub-1', active: true });
      const result = await service.unsubscribe('socket-1', WsChannel.QUEST_NEW);
      expect(result.success).toBe(true);
      expect(mockSocket.leave).toHaveBeenCalledWith(WsChannel.QUEST_NEW);
    });

    it('should return error for non-existent client', async () => {
      const result = await service.subscribe('non-existent', WsChannel.QUEST_NEW);
      expect(result.success).toBe(false);
    });

    it('should restore subscriptions on reconnect', async () => {
      mockSubscriptionRepo.find.mockResolvedValue([
        { channel: WsChannel.QUEST_NEW, resourceId: null },
        { channel: WsChannel.PAYOUT_CONFIRMATION, resourceId: null },
      ]);
      await service.restoreSubscriptions(mockSocket);
      expect(mockSocket.join).toHaveBeenCalledTimes(3); // 1 from registerClient + 2 from restore
    });
  });

  describe('messaging', () => {
    it('should send to user', async () => {
      await service.sendToUser('user-1', 'test-event', { data: 'test' }, WsChannel.QUEST_NEW);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalled();
      expect(mockMessageRepo.save).toHaveBeenCalled();
    });

    it('should send to channel', async () => {
      await service.sendToChannel(WsChannel.QUEST_NEW, 'quest:created', { id: '1' });
      expect(mockServer.to).toHaveBeenCalledWith(WsChannel.QUEST_NEW);
      expect(mockServer.emit).toHaveBeenCalled();
    });

    it('should broadcast to all', async () => {
      await service.broadcast('announcement', { msg: 'Hello everyone' });
      expect(mockServer.emit).toHaveBeenCalledWith(
        'announcement',
        expect.objectContaining({ channel: WsChannel.BROADCAST }),
      );
    });

    it('should broadcast to role', async () => {
      service.registerClient(mockSocket);
      await service.broadcastToRole('USER', 'role-event', { msg: 'For users' });
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('message history', () => {
    it('should fetch message history', async () => {
      const messages = await service.getMessageHistory(WsChannel.QUEST_NEW, 'user-1');
      expect(mockMessageRepo.createQueryBuilder).toHaveBeenCalled();
      expect(messages).toEqual([]);
    });

    it('should limit results to 200 max', async () => {
      await service.getMessageHistory(WsChannel.QUEST_NEW, 'user-1', undefined, 500);
      const queryBuilder = mockMessageRepo.createQueryBuilder();
      expect(queryBuilder.take).toHaveBeenCalledWith(200);
    });
  });

  describe('rate limiting', () => {
    it('should allow messages within limit', () => {
      expect(service.checkRateLimit('socket-1')).toBe(true);
    });

    it('should reject when rate limit exceeded', () => {
      for (let i = 0; i < 61; i++) {
        service.checkRateLimit('socket-1');
      }
      expect(service.checkRateLimit('socket-1')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return connection stats', () => {
      service.registerClient(mockSocket);
      const stats = service.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.uniqueUsers).toBe(1);
      expect(stats).toHaveProperty('timestamp');
    });
  });
});
