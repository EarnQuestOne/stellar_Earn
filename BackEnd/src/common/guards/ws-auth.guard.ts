import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { getJwtPublicKeys } from '../utils/jwt-keys';
import { parseCookies } from '../utils/security.utils';
import { getApplicationSecurityConfig } from '../../config/security.config';

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

      const publicKeys = getJwtPublicKeys(this.configService);

      let payload: WsAuthPayload | null = null;
      for (const publicKey of publicKeys) {
        try {
          payload = await this.jwtService.verifyAsync<WsAuthPayload>(token, {
            publicKey,
            algorithms: ['RS256'],
          });
          break;
        } catch {
          // try next key
        }
      }

      if (!payload) {
        throw new WsException('Invalid token signature');
      }

      client.data.user = {
        id: payload.sub,
        stellarAddress: payload.stellarAddress,
        role: payload.role,
      };

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`WS auth failed for socket ${client.id}: ${message}`);
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    // 1. Check cookie first (httpOnly auth_token set by backend)
    const cookieHeader = client.handshake?.headers?.cookie;
    if (cookieHeader) {
      const securityConfig = getApplicationSecurityConfig(this.configService);
      const cookies = parseCookies(cookieHeader);
      const cookieToken = cookies[securityConfig.cookies.accessTokenName];
      if (cookieToken) return cookieToken;
    }

    // 2. Fall back to auth object (Bearer token from client handshake)
    const authHeader =
      client.handshake?.auth?.token || client.handshake?.headers?.authorization;

    if (!authHeader) return null;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return authHeader;
  }
}
