import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // Attach decoded user to client so handlers can read it via client.data.user.
      client.data.user = payload;
      return true;
    } catch {
      client.disconnect();
      throw new WsException('Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Check Authorization header first, then query param as fallback.
    const authHeader =
      client.handshake.headers['authorization'] ||
      client.handshake.headers['Authorization'];

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return client.handshake.query['token'] as string | undefined;
  }
}
