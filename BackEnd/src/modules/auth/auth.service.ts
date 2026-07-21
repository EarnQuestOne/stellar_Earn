import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto, ChallengeResponseDto } from './dto/auth.dto';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import {
  generateChallengeMessage,
  verifyStellarSignature,
  isChallengeExpired,
  extractTimestampFromChallenge,
} from './utils/signature';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface AuthUser {
  id: string;
  stellarAddress: string;
  role: string;
}

export interface OAuthProfile {
  googleId?: string;
  githubId?: string;
  email: string;
  username: string;
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
   * Resolve the identity encoded in a verified JWT payload. Called by
   * `JwtStrategy` once the token's signature has already been checked, so
   * `payload` is trustworthy — but role/identity are still re-resolved from
   * the database here rather than trusted as-is, so a stale or forged claim
   * embedded in an older token can never grant access it shouldn't have.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const identifier = payload?.sub || payload?.stellarAddress;
    if (!identifier) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return this.validateUser(identifier);
  }

  async validateUser(idOrAddress: string): Promise<AuthUser> {
    const isStellarAddress =
      idOrAddress.length === 56 && idOrAddress.startsWith('G');

    if (isStellarAddress) {
      try {
        const user = await this.usersService.findByAddress(idOrAddress);
        if (user) {
          return {
            id: user.id,
            stellarAddress: user.stellarAddress ?? '',
            role: user.role,
          };
        }
      } catch {
        // unknown address — fall through to default
      }
      return { id: idOrAddress, stellarAddress: idOrAddress, role: Role.USER };
    }

    const user = await this.usersService.findById(idOrAddress);
    if (user) {
      return {
        id: user.id,
        stellarAddress: user.stellarAddress ?? '',
        role: user.role,
      };
    }
    return { id: idOrAddress, stellarAddress: '', role: Role.USER };
  }

  async generateChallenge(
    stellarAddress: string,
  ): Promise<ChallengeResponseDto> {
    const timestamp = Date.now();
    const challenge = generateChallengeMessage(stellarAddress, timestamp);
    const expiresAt = new Date(timestamp + 5 * 60 * 1000);
    return { challenge, expiresAt };
  }

  login(stellarAddress: string): { accessToken: string; expiresIn: number } {
    const payload = { stellarAddress, sub: 'login' };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, expiresIn: 3600 };
  }

  async verifyAndLogin(
    dto: LoginDto,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const { stellarAddress, challenge, signature } = dto;

    const timestamp = extractTimestampFromChallenge(challenge);
    if (isChallengeExpired(timestamp, 5)) {
      throw new UnauthorizedException('Challenge has expired');
    }

    verifyStellarSignature(stellarAddress, signature, challenge);

    const payload = { stellarAddress, sub: stellarAddress };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, expiresIn: 3600 };
  }

  async generateTokens(
    subject: string,
    userId: string | null,
    stellarAddress: string | null,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const expirationStr = this.configService.get<string>(
      'JWT_ACCESS_TOKEN_EXPIRATION',
      '15m',
    );
    const expiresIn = this.parseExpirationToMs(expirationStr);

    const payload = { sub: subject, userId, stellarAddress, role };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const refreshExpirationStr = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
      '7d',
    );
    const refreshExpiresMs = this.parseExpirationToMs(refreshExpirationStr);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash,
      userId: userId ?? undefined,
      stellarAddress: stellarAddress ?? undefined,
      familyId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + refreshExpiresMs),
      isRevoked: false,
      revokedAt: null,
      replacedByTokenId: null,
      revokedReason: null,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: Math.floor(expiresIn / 1000),
    };
  }

  async refreshTokens(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: AuthUser;
  }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const existing = await this.refreshTokenRepository.findOne({
      where: [{ tokenHash }, { tokenHash: token }],
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > existing.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.usersService.findById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    existing.isRevoked = true;
    existing.revokedAt = new Date();
    await this.refreshTokenRepository.save(existing);

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const refreshExpiresMs = this.parseExpirationToMs(
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
    );

    const newRefreshToken = this.refreshTokenRepository.create({
      tokenHash: newTokenHash,
      userId: existing.userId,
      stellarAddress: existing.stellarAddress,
      familyId: existing.familyId,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
      isRevoked: false,
      revokedAt: null,
      replacedByTokenId: null,
      revokedReason: null,
    });
    await this.refreshTokenRepository.save(newRefreshToken);

    const jwtPayload = {
      sub: user.id,
      userId: user.id,
      stellarAddress: user.stellarAddress,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(jwtPayload);
    const accessExpiresMs = this.parseExpirationToMs(
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
    );

    const authUser: AuthUser = {
      id: user.id,
      stellarAddress: user.stellarAddress ?? '',
      role: user.role,
    };

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: Math.floor(accessExpiresMs / 1000),
      user: authUser,
    };
  }

  async revokeToken(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      const token = await this.refreshTokenRepository.findOne({
        where: [{ id: tokenId, userId }, { id: tokenId }],
      });
      if (!token) {
        throw new NotFoundException('Token not found');
      }
      token.isRevoked = true;
      token.revokedAt = new Date();
      await this.refreshTokenRepository.save(token);
    } else {
      await this.refreshTokenRepository
        .createQueryBuilder(RefreshToken.name)
        .update(RefreshToken)
        .set({ isRevoked: true })
        .where('userId = :userId', { userId })
        .execute();
    }
  }

  async loginOAuthUser(profile: OAuthProfile): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }> {
    let user = null;

    if (profile.googleId) {
      user = await this.usersService.findByGoogleId(profile.googleId);
    }

    if (!user && profile.githubId) {
      user = await this.usersService.findByGithubId(profile.githubId);
    }

    if (!user && profile.email) {
      user = await this.usersService.findByEmail(profile.email);
    }

    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        username: profile.username,
        googleId: profile.googleId,
        githubId: profile.githubId,
        avatarUrl: profile.avatarUrl,
        role: Role.USER,
      });
    }

    const tokens = await this.generateTokens(
      user.id,
      user.id,
      user.stellarAddress,
      user.role as Role,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        stellarAddress: user.stellarAddress ?? '',
        role: user.role as string,
      },
    };
  }

  private parseExpirationToMs(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }
}
