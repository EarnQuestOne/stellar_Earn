import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { WebsocketService } from './websocket.service';
import { SubscribeDto, UnsubscribeDto } from './dto/subscribe.dto';
import { ChatMessageDto, FetchHistoryDto } from './dto/ws-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : [],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class AppWebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AppWebsocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly wsService: WebsocketService,
    private readonly wsAuthGuard: WsAuthGuard,
  ) {}

  afterInit(server: Server) {
    this.wsService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const isAuthenticated = await this.wsAuthGuard.validateClient(client);
      if (!isAuthenticated) {
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect(true);
        return;
      }

      this.wsService.registerClient(client);
      await this.wsService.restoreSubscriptions(client);

      client.emit('connected', {
        message: 'Connected to StellarEarn WebSocket',
        socketId: client.id,
        user: client.data.user,
        timestamp: new Date().toISOString(),
      });
    } catch {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.wsService.removeClient(client.id);
  }

  @SubscribeMessage('subscribe')
  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeDto,
  ) {
    if (!this.wsService.checkRateLimit(client.id)) {
      throw new WsException('Rate limit exceeded');
    }

    const result = await this.wsService.subscribe(
      client.id,
      data.channel,
      data.resourceId,
    );

    return { event: 'subscribed', data: result };
  }

  @SubscribeMessage('unsubscribe')
  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UnsubscribeDto,
  ) {
    if (!this.wsService.checkRateLimit(client.id)) {
      throw new WsException('Rate limit exceeded');
    }

    const result = await this.wsService.unsubscribe(
      client.id,
      data.channel,
      data.resourceId,
    );

    return { event: 'unsubscribed', data: result };
  }

  @SubscribeMessage('chat:message')
  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatMessageDto,
  ) {
    if (!this.wsService.checkRateLimit(client.id)) {
      throw new WsException('Rate limit exceeded');
    }

    const user = client.data.user;
    const roomName = `chat:${data.roomId}`;

    this.server.to(roomName).emit('chat:message', {
      roomId: data.roomId,
      message: data.message,
      sender: {
        id: user.id,
        stellarAddress: user.stellarAddress,
      },
      timestamp: new Date().toISOString(),
    });

    return { event: 'chat:sent', data: { roomId: data.roomId } };
  }

  @SubscribeMessage('chat:join')
  @UseGuards(WsAuthGuard)
  async handleChatJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!data?.roomId) {
      throw new WsException('roomId is required');
    }

    const roomName = `chat:${data.roomId}`;
    client.join(roomName);

    const user = client.data.user;
    this.server.to(roomName).emit('chat:user-joined', {
      roomId: data.roomId,
      user: { id: user.id, stellarAddress: user.stellarAddress },
      timestamp: new Date().toISOString(),
    });

    return { event: 'chat:joined', data: { roomId: data.roomId } };
  }

  @SubscribeMessage('chat:leave')
  @UseGuards(WsAuthGuard)
  async handleChatLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!data?.roomId) {
      throw new WsException('roomId is required');
    }

    const roomName = `chat:${data.roomId}`;
    client.leave(roomName);

    const user = client.data.user;
    this.server.to(roomName).emit('chat:user-left', {
      roomId: data.roomId,
      user: { id: user.id, stellarAddress: user.stellarAddress },
      timestamp: new Date().toISOString(),
    });

    return { event: 'chat:left', data: { roomId: data.roomId } };
  }

  @SubscribeMessage('history')
  @UseGuards(WsAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleFetchHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: FetchHistoryDto,
  ) {
    if (!this.wsService.checkRateLimit(client.id)) {
      throw new WsException('Rate limit exceeded');
    }

    const user = client.data.user;
    const since = data.since ? new Date(data.since) : undefined;
    const messages = await this.wsService.getMessageHistory(
      data.channel,
      user.id,
      since,
      data.limit,
    );

    return { event: 'history', data: { channel: data.channel, messages } };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return {
      event: 'pong',
      data: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('stats')
  @UseGuards(WsAuthGuard)
  handleStats(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (user.role !== 'ADMIN') {
      throw new WsException('Forbidden: admin only');
    }

    return { event: 'stats', data: this.wsService.getStats() };
  }
}
