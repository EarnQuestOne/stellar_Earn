import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

export interface WsAuthPayload {
  sub: string;
  stellarAddress: string;
  role: string;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    return this.validateClient(client);
  }

   async validateClient(client: Socket): Promise<boolean> {
     try {
       const token = this.extractToken(client);
       if (!token) {
         throw new WsException('Missing authentication token');
       }

       const publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');
       const payload = await this.jwtService.verifyAsync<WsAuthPayload>(token, {
         publicKey,
       });

      client.data.user = {
        id: payload.sub,
        stellarAddress: payload.stellarAddress,
        role: payload.role,
      };

      return true;
    } catch (error) {
      this.logger.warn(
        `WS auth failed for socket ${client.id}: ${error.message}`,
      );
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization;

    if (!authHeader) return null;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return authHeader;
  }
}
