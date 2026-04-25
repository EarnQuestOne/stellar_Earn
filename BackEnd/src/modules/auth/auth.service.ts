import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/user.service';
import { User } from '../users/entities/user.entity';
import {
  generateChallengeMessage,
  verifyStellarSignature,
  isChallengeExpired,
  extractTimestampFromChallenge,
} from './utils/signature';
import {
  LoginDto,
  TokenResponseDto,
  UserResponseDto,
  ChallengeResponseDto,
} from './dto/auth.dto';
import * as crypto from 'crypto';
import { Role } from '../../common/enums/role.enum';

export interface AuthUser {
  id: string;
  stellarAddress: string | null;
  role: Role;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TOKEN_COOKIE = 'auth_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

export interface OAuthUserProfile {
  googleId?: string;
  githubId?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  provider: 'google' | 'github';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Generate a challenge message for wallet signature
   */
  async generateChallenge(
    stellarAddress: string,
  ): Promise<ChallengeResponseDto> {
    const timestamp = Date.now();
    const challenge = generateChallengeMessage(stellarAddress, timestamp);

    const expirationMinutes = parseInt(
      this.configService.get<string>('AUTH_CHALLENGE_EXPIRATION', '5'),
      10,
    );

    const expiresAt = new Date(timestamp + expirationMinutes * 60 * 1000);

    return {
      challenge,
      expiresAt,
    };
  }

  /**
   * Verify signature and login user
   */
  async verifySignatureAndLogin(loginDto: LoginDto): Promise<TokenResponseDto> {
    const { stellarAddress, signature, challenge } = loginDto;

    const timestamp = extractTimestampFromChallenge(challenge);
    const expirationMinutes = parseInt(
      this.configService.get<string>('AUTH_CHALLENGE_EXPIRATION', '5'),
      10,
    );

    if (isChallengeExpired(timestamp, expirationMinutes)) {
      throw new UnauthorizedException('Challenge has expired');
    }

    verifyStellarSignature(stellarAddress, signature, challenge);

    const role = this.getRoleForAddress(stellarAddress);
    const tokens = await this.generateTokens(stellarAddress, null, stellarAddress, role);

    return {
      ...tokens,
      user: this.mapToUserResponse(stellarAddress, role),
    };
}

  private clearAuthCookies(response: Response): void {
    const configService = this.configService;
    const domain = configService.get<string>('COOKIE_DOMAIN');

    response.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  }

  async loginOAuthUser(profile: OAuthUserProfile): Promise<TokenResponseDto> {
    const user = await this.findOrCreateOAuthUser(profile);
    const role = user.role;

    const tokens = await this.generateTokens(user.id, user.id, user.stellarAddress ?? null, role);

    return {
      ...tokens,
      user: this.mapToUserResponse(user.stellarAddress, role),
    };
  }

  private async findOrCreateOAuthUser(profile: OAuthUserProfile): Promise<User> {
    let user: User | null = null;

    if (profile.googleId) {
      user = await this.usersService.findByGoogleId(profile.googleId);
    }

    if (!user && profile.githubId) {
      user = await this.usersService.findByGithubId(profile.githubId);
    }

    if (!user && profile.email) {
      user = await this.usersService.findByEmail(profile.email);
    }

    const updateData: Partial<User> = {
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      googleId: profile.googleId,
      githubId: profile.githubId,
    };

    if (user) {
      Object.assign(user, updateData);
      return this.usersService.create(user);
    }

    return this.usersService.create(updateData);
  }

  /**
   * Issue a new access + refresh token pair. When called as part of a refresh
   * rotation, pass the existing `familyId` so the new token belongs to the
   * same lineage; otherwise a fresh family is created (e.g. on login).
   */
  async generateTokens(
    tokenSubject: string,
    userId: string | null,
    stellarAddress: string | null,
    role: Role,
    familyId?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const payload = {
      sub: tokenSubject,
      stellarAddress,
      role,
    };

    const accessTokenExpiration = this.configService.get<string>(
      'JWT_ACCESS_TOKEN_EXPIRATION',
      '15m',
    );

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiration,
    } as any);

    const expiresIn = this.parseExpirationToMs(accessTokenExpiration);

    // The plaintext refresh token is returned to the caller exactly once
    // (in this response) and only its SHA-256 hash is persisted. A DB leak
    // therefore cannot be replayed against /auth/refresh.
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenExpiration = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
      '7d',
    );

    const expirationMs = this.parseExpirationToMs(refreshTokenExpiration);
    const expiresAt = new Date(Date.now() + expirationMs);

    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId,
      stellarAddress,
      familyId: familyId ?? crypto.randomUUID(),
      expiresAt,
    });

    const saved = await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: this.encodeRefreshToken(saved.id, refreshTokenValue),
      expiresIn,
    };
  }

  /**
   * Rotate a refresh token: validate the presented value, mark it consumed,
   * and issue a fresh pair under the same family. If the presented token has
   * already been rotated/revoked, treat it as a stolen-token reuse attempt
   * and revoke the entire family before failing.
   */
  async refreshTokens(refreshTokenValue: string): Promise<TokenResponseDto> {
    const decoded = this.decodeRefreshToken(refreshTokenValue);
    if (!decoded) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashRefreshToken(decoded.secret);
    const stored = await this.refreshTokenRepository.findOne({
      where: { id: decoded.id, tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.isRevoked) {
      // A previously-rotated (or otherwise revoked) token is being presented
      // again. The legitimate client would only ever use the latest token, so
      // this is treated as a stolen-token replay: kill the whole family to
      // force the real user (and the attacker) back through /auth/login.
      this.logger.warn(
        `Refresh token reuse detected for family ${stored.familyId}; revoking entire family`,
      );
      await this.revokeFamily(
        stored.familyId,
        RefreshTokenRevokeReason.REUSE_DETECTED,
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > stored.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const role = this.getRoleForAddress(stored.stellarAddress);
    const tokens = await this.generateTokens(
      stored.stellarAddress,
      role,
      stored.familyId,
    );

    const user = refreshToken.userId
      ? await this.usersService.findById(refreshToken.userId)
      : await this.getStellarAuthUser(refreshToken.stellarAddress);

    const tokens = await this.generateTokens(user.id, user.id, user.stellarAddress ?? null, user.role);

    return {
      ...tokens,
      user: this.mapToUserResponse(user.stellarAddress, user.role),
    };
  }

  /**
   * Revoke a specific refresh token or all the user's active tokens.
   */
  async revokeToken(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      const token = await this.refreshTokenRepository.findOne({
        where: [
          { id: tokenId, userId },
          { id: tokenId, stellarAddress: userId },
        ],
      });

      if (!token) {
        throw new NotFoundException('Token not found');
      }

      token.isRevoked = true;
      token.revokedAt = now;
      token.revokedReason = RefreshTokenRevokeReason.LOGOUT;
      await this.refreshTokenRepository.save(token);
    } else {
      await this.refreshTokenRepository.createQueryBuilder()
        .update(RefreshToken)
        .set({ isRevoked: true })
        .where('userId = :userId OR stellarAddress = :userId', { userId })
        .execute();
    }

    await this.refreshTokenRepository.update(
      { stellarAddress, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: now,
        revokedReason: RefreshTokenRevokeReason.LOGOUT_ALL,
      },
    );
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(subject: string): Promise<AuthUser> {
    if (subject?.length === 56 && subject.startsWith('G')) {
      try {
        const user = await this.usersService.findByAddress(subject);
        return {
          id: user.id,
          stellarAddress: user.stellarAddress,
          role: user.role,
        };
      } catch {
        return {
          id: subject,
          stellarAddress: subject,
          role: this.getRoleForAddress(subject),
        };
      }
    }

    const user = await this.usersService.findById(subject);
    return {
      id: user.id,
      stellarAddress: user.stellarAddress,
      role: user.role,
    };
  }

  /**
   * Revoke every still-active refresh token in a family. Used by
   * reuse-detection — a presented-after-rotation token means at least one
   * party in the chain is malicious, so all current tokens are invalidated.
   */
  private async revokeFamily(
    familyId: string,
    reason: RefreshTokenRevokeReason,
  ): Promise<void> {
    await this.refreshTokenRepository.update(
      { familyId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
  }

  private hashRefreshToken(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * The wire format embeds the row id alongside the secret so the lookup is
   * O(1) by primary key and we don't have to scan the table by hash. Format:
   *   <uuid>.<hex-secret>
   */
  private encodeRefreshToken(id: string, secret: string): string {
    return `${id}.${secret}`;
  }

  private decodeRefreshToken(
    value: string,
  ): { id: string; secret: string } | null {
    const sep = value.indexOf('.');
    if (sep <= 0 || sep === value.length - 1) {
      return null;
    }
    return {
      id: value.slice(0, sep),
      secret: value.slice(sep + 1),
    };
  }

  /**
   * Get role for a Stellar address based on configuration
   */
  private async getStellarAuthUser(stellarAddress: string): Promise<AuthUser> {
    if (!stellarAddress) {
      throw new UnauthorizedException('Invalid stellar address');
    }

    try {
      const user = await this.usersService.findByAddress(stellarAddress);
      return {
        id: user.id,
        stellarAddress: user.stellarAddress,
        role: user.role,
      };
    } catch {
      return {
        id: stellarAddress,
        stellarAddress,
        role: this.getRoleForAddress(stellarAddress),
      };
    }
  }

  private getRoleForAddress(stellarAddress: string | null): Role {
    const adminAddresses = this.configService
      .get<string>('ADMIN_ADDRESSES', '')
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    return stellarAddress && adminAddresses.includes(stellarAddress)
      ? Role.ADMIN
      : Role.USER;
  }

  /**
   * Map to user response DTO
   */
  private mapToUserResponse(
    stellarAddress: string | null,
    role: Role,
  ): UserResponseDto {
    return {
      stellarAddress: stellarAddress ?? null,
      role,
    };
  }

  /**
   * Parse expiration string (e.g., "7d", "15m") to milliseconds
   */
  private parseExpirationToMs(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
