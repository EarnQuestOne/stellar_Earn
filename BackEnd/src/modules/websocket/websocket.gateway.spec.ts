import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppWebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { WsChannel } from './entities/ws-subscription.entity';

describe('AppWebsocketGateway', () => {
  let gateway: AppWebsocketGateway;
  let wsService: jest.Mocked<WebsocketService>;

  const mockSocket: any = {
    id: 'test-socket-id',
    data: {
      user: {
        id: 'user-1',
        stellarAddress: 'GABCDEF...',
        role: 'USER',
      },
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    handshake: { auth: { token: 'valid-token' }, headers: {} },
  };

  const mockServer: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppWebsocketGateway,
        {
          provide: WebsocketService,
          useValue: {
            setServer: jest.fn(),
            registerClient: jest.fn(),
            removeClient: jest.fn(),
            restoreSubscriptions: jest.fn(),
            subscribe: jest.fn().mockResolvedValue({ success: true, message: 'Subscribed' }),
            unsubscribe: jest.fn().mockResolvedValue({ success: true, message: 'Unsubscribed' }),
            checkRateLimit: jest.fn().mockReturnValue(true),
            getMessageHistory: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockReturnValue({ totalConnections: 1, uniqueUsers: 1 }),
          },
        },
        {
          provide: WsAuthGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
            validateClient: jest.fn().mockResolvedValue(true),
          },
        },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    gateway = module.get<AppWebsocketGateway>(AppWebsocketGateway);
    wsService = module.get(WebsocketService);
    gateway.server = mockServer;
  });

  afterEach(() => jest.clearAllMocks());

  describe('lifecycle', () => {
    it('should initialize and set server', () => {
      gateway.afterInit(mockServer);
      expect(wsService.setServer).toHaveBeenCalledWith(mockServer);
    });

    it('should register client on connection', async () => {
      await gateway.handleConnection(mockSocket);
      expect(wsService.registerClient).toHaveBeenCalledWith(mockSocket);
      expect(wsService.restoreSubscriptions).toHaveBeenCalledWith(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        socketId: 'test-socket-id',
      }));
    });

    it('should remove client on disconnect', () => {
      gateway.handleDisconnect(mockSocket);
      expect(wsService.removeClient).toHaveBeenCalledWith('test-socket-id');
    });
  });

  describe('subscribe', () => {
    it('should subscribe to a channel', async () => {
      const dto = { channel: WsChannel.QUEST_NEW };
      const result = await gateway.handleSubscribe(mockSocket, dto);
      expect(wsService.subscribe).toHaveBeenCalledWith(
        'test-socket-id',
        WsChannel.QUEST_NEW,
        undefined,
      );
      expect(result.data.success).toBe(true);
    });

    it('should reject when rate limited', async () => {
      wsService.checkRateLimit.mockReturnValue(false);
      await expect(
        gateway.handleSubscribe(mockSocket, { channel: WsChannel.QUEST_NEW }),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from a channel', async () => {
      const dto = { channel: WsChannel.QUEST_NEW };
      const result = await gateway.handleUnsubscribe(mockSocket, dto);
      expect(wsService.unsubscribe).toHaveBeenCalledWith(
        'test-socket-id',
        WsChannel.QUEST_NEW,
        undefined,
      );
      expect(result.data.success).toBe(true);
    });
  });

  describe('chat', () => {
    it('should handle chat messages', async () => {
      const dto = { roomId: 'room-1', message: 'Hello' };
      const result = await gateway.handleChatMessage(mockSocket, dto);
      expect(mockServer.to).toHaveBeenCalledWith('chat:room-1');
      expect(result.event).toBe('chat:sent');
    });

    it('should handle chat join', async () => {
      const result = await gateway.handleChatJoin(mockSocket, { roomId: 'room-1' });
      expect(mockSocket.join).toHaveBeenCalledWith('chat:room-1');
      expect(result.event).toBe('chat:joined');
    });

    it('should handle chat leave', async () => {
      const result = await gateway.handleChatLeave(mockSocket, { roomId: 'room-1' });
      expect(mockSocket.leave).toHaveBeenCalledWith('chat:room-1');
      expect(result.event).toBe('chat:left');
    });
  });

  describe('history', () => {
    it('should fetch message history', async () => {
      const dto = { channel: WsChannel.QUEST_NEW };
      const result = await gateway.handleFetchHistory(mockSocket, dto);
      expect(wsService.getMessageHistory).toHaveBeenCalledWith(
        WsChannel.QUEST_NEW,
        'user-1',
        undefined,
        undefined,
      );
      expect(result.event).toBe('history');
    });
  });

  describe('ping', () => {
    it('should respond with pong', () => {
      const result = gateway.handlePing(mockSocket);
      expect(result.event).toBe('pong');
      expect(result.data).toHaveProperty('timestamp');
    });
  });

  describe('stats', () => {
    it('should return stats for admin', () => {
      mockSocket.data.user.role = 'ADMIN';
      const result = gateway.handleStats(mockSocket);
      expect(result.event).toBe('stats');
      expect(wsService.getStats).toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      mockSocket.data.user.role = 'USER';
      expect(() => gateway.handleStats(mockSocket)).toThrow('Forbidden: admin only');
    });
  });
});
