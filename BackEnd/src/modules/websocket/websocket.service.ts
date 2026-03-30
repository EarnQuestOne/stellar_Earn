import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { WsSubscription, WsChannel } from './entities/ws-subscription.entity';
import { WsMessage } from './entities/ws-message.entity';

interface ConnectedClient {
  socket: Socket;
  userId: string;
  stellarAddress: string;
  role: string;
  subscribedChannels: Set<string>;
  connectedAt: Date;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  private server: Server;
  private clients = new Map<string, ConnectedClient>();
  private userSocketMap = new Map<string, Set<string>>();
  private rateLimits = new Map<string, RateLimitEntry>();

  private readonly RATE_LIMIT_WINDOW_MS = 60_000;
  private readonly RATE_LIMIT_MAX_MESSAGES = 60;

  constructor(
    @InjectRepository(WsSubscription)
    private readonly subscriptionRepo: Repository<WsSubscription>,
    @InjectRepository(WsMessage)
    private readonly messageRepo: Repository<WsMessage>,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  // --- Connection Management ---

  registerClient(socket: Socket): void {
    const user = socket.data.user;
    if (!user) return;

    const client: ConnectedClient = {
      socket,
      userId: user.id,
      stellarAddress: user.stellarAddress,
      role: user.role,
      subscribedChannels: new Set(),
      connectedAt: new Date(),
    };

    this.clients.set(socket.id, client);

    if (!this.userSocketMap.has(user.id)) {
      this.userSocketMap.set(user.id, new Set());
    }
    this.userSocketMap.get(user.id)!.add(socket.id);

    socket.join(`user:${user.id}`);

    this.logger.log(
      `Client connected: ${socket.id} (user: ${user.stellarAddress})`,
    );
  }

  removeClient(socketId: string): void {
    const client = this.clients.get(socketId);
    if (!client) return;

    const userSockets = this.userSocketMap.get(client.userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSocketMap.delete(client.userId);
      }
    }

    this.rateLimits.delete(socketId);
    this.clients.delete(socketId);

    this.logger.log(
      `Client disconnected: ${socketId} (user: ${client.stellarAddress})`,
    );
  }

  getClient(socketId: string): ConnectedClient | undefined {
    return this.clients.get(socketId);
  }

  getConnectedUserCount(): number {
    return this.userSocketMap.size;
  }

  getConnectionCount(): number {
    return this.clients.size;
  }

  // --- Subscription Management ---

  async subscribe(
    socketId: string,
    channel: WsChannel,
    resourceId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const client = this.clients.get(socketId);
    if (!client) {
      return { success: false, message: 'Client not found' };
    }

    const roomName = this.buildRoomName(channel, resourceId);
    client.socket.join(roomName);
    client.subscribedChannels.add(roomName);

    const existing = await this.subscriptionRepo.findOne({
      where: {
        userId: client.userId,
        channel,
        resourceId: resourceId ?? undefined,
      },
    });

    if (existing) {
      existing.active = true;
      await this.subscriptionRepo.save(existing);
    } else {
      const sub = this.subscriptionRepo.create({
        userId: client.userId,
        channel,
        resourceId: resourceId ?? undefined,
        active: true,
      });
      await this.subscriptionRepo.save(sub);
    }

    this.logger.debug(
      `Client ${socketId} subscribed to ${roomName}`,
    );

    return { success: true, message: `Subscribed to ${channel}` };
  }

  async unsubscribe(
    socketId: string,
    channel: WsChannel,
    resourceId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const client = this.clients.get(socketId);
    if (!client) {
      return { success: false, message: 'Client not found' };
    }

    const roomName = this.buildRoomName(channel, resourceId);
    client.socket.leave(roomName);
    client.subscribedChannels.delete(roomName);

    const existing = await this.subscriptionRepo.findOne({
      where: {
        userId: client.userId,
        channel,
        resourceId: resourceId ?? undefined,
      },
    });

    if (existing) {
      existing.active = false;
      await this.subscriptionRepo.save(existing);
    }

    this.logger.debug(
      `Client ${socketId} unsubscribed from ${roomName}`,
    );

    return { success: true, message: `Unsubscribed from ${channel}` };
  }

  async restoreSubscriptions(socket: Socket): Promise<void> {
    const user = socket.data.user;
    if (!user) return;

    const subscriptions = await this.subscriptionRepo.find({
      where: { userId: user.id, active: true },
    });

    for (const sub of subscriptions) {
      const roomName = this.buildRoomName(sub.channel, sub.resourceId);
      socket.join(roomName);

      const client = this.clients.get(socket.id);
      if (client) {
        client.subscribedChannels.add(roomName);
      }
    }

    if (subscriptions.length > 0) {
      this.logger.debug(
        `Restored ${subscriptions.length} subscriptions for user ${user.stellarAddress}`,
      );
    }
  }

  // --- Message Sending & Broadcasting ---

  async sendToUser(
    userId: string,
    event: string,
    payload: any,
    channel?: WsChannel,
  ): Promise<void> {
    if (channel) {
      await this.persistMessage(channel, event, payload, userId ?? undefined, false);
    }

    this.server?.to(`user:${userId}`).emit(event, {
      channel,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  async sendToChannel(
    channel: WsChannel,
    event: string,
    payload: any,
    resourceId?: string,
  ): Promise<void> {
    const roomName = this.buildRoomName(channel, resourceId);
    await this.persistMessage(channel, event, payload, undefined, false);

    this.server?.to(roomName).emit(event, {
      channel,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  async broadcast(event: string, payload: any): Promise<void> {
    await this.persistMessage(
      WsChannel.BROADCAST,
      event,
      payload,
      undefined,
      true,
    );

    this.server?.emit(event, {
      channel: WsChannel.BROADCAST,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  async broadcastToRole(
    role: string,
    event: string,
    payload: any,
  ): Promise<void> {
    for (const [, client] of this.clients) {
      if (client.role === role) {
        client.socket.emit(event, {
          channel: WsChannel.BROADCAST,
          data: payload,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // --- Message Persistence & History ---

  private async persistMessage(
    channel: WsChannel,
    event: string,
    payload: any,
    targetUserId: string | undefined,
    isBroadcast: boolean,
  ): Promise<void> {
    try {
      const message = this.messageRepo.create({
        channel,
        event,
        payload,
        targetUserId,
        isBroadcast,
      });
      await this.messageRepo.save(message);
    } catch (error: any) {
      this.logger.error(`Failed to persist WS message: ${error?.message}`);
    }
  }

  async getMessageHistory(
    channel: WsChannel,
    userId: string,
    since?: Date,
    limit = 50,
  ): Promise<WsMessage[]> {
    const effectiveLimit = Math.min(limit, 200);
    const query = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.channel = :channel', { channel })
      .andWhere(
        '(msg.targetUserId = :userId OR msg.targetUserId IS NULL OR msg.isBroadcast = true)',
        { userId },
      )
      .orderBy('msg.createdAt', 'DESC')
      .take(effectiveLimit);

    if (since) {
      query.andWhere('msg.createdAt > :since', { since });
    }

    return query.getMany();
  }

  // --- Rate Limiting ---

  checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(socketId);

    if (!entry || now - entry.windowStart > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(socketId, { count: 1, windowStart: now });
      return true;
    }

    entry.count++;
    if (entry.count > this.RATE_LIMIT_MAX_MESSAGES) {
      this.logger.warn(`Rate limit exceeded for socket ${socketId}`);
      return false;
    }

    return true;
  }

  // --- Helpers ---

  private buildRoomName(channel: WsChannel, resourceId?: string): string {
    return resourceId ? `${channel}:${resourceId}` : channel;
  }

  getStats() {
    return {
      totalConnections: this.clients.size,
      uniqueUsers: this.userSocketMap.size,
      timestamp: new Date().toISOString(),
    };
  }
}
