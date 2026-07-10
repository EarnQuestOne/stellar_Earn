import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verify } from 'jsonwebtoken';
import { AuthService } from '../auth.service';
import { getJwtPublicKeys } from '../../../common/utils/jwt-keys';

export interface JwtPayload {
  sub: string;
  stellarAddress: string;
  role: string;
}

const ACCESS_TOKEN_COOKIE = 'auth_token';

function parseCookies(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.trim().split('=');
    const name = parts[0];
    if (name) {
      cookies[name] = parts.slice(1).join('=');
    }
  });
  return cookies;
}

function extractJwtFromCookie(req: Request): string | null {
  if (!req || !req.headers) {
    return null;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[ACCESS_TOKEN_COOKIE] || null;
}

@Injectable()
export class JwtStrategy extends Strategy {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const publicKeys = getJwtPublicKeys(configService);

    super(
      {
        jwtFromRequest: (req) => {
          const fromCookie = extractJwtFromCookie(req);
          if (fromCookie) {
            return fromCookie;
          }
          return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        },
        ignoreExpiration: false,
        secretOrKeyProvider: (_req, rawJwtToken, done) => {
          const token = String(rawJwtToken);

          for (const key of publicKeys) {
            try {
              verify(token, key, { algorithms: ['RS256'] });
              done(null, key);
              return;
            } catch {
              // try next key
            }
          }

          done(new Error('Invalid token signature'));
        },
      },
      async (payload: JwtPayload) => {
        return this.authService.validate(payload.stellarAddress);
      },
    );
  }
}
