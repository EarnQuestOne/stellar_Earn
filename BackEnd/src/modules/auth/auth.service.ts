import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  stellarAddress: string;
  role: Role;
}

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
   * Generate access and refresh tokens
   */
  async generateTokens(
    tokenSubject: string,
    userId: string | null,
    stellarAddress: string | null,
    role: Role,
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
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshTokenValue: string): Promise<TokenResponseDto> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenValue },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    refreshToken.isRevoked = true;
    await this.refreshTokenRepository.save(refreshToken);

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
   * Revoke a specific refresh token or all user tokens
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
      await this.refreshTokenRepository.save(token);
    } else {
      await this.refreshTokenRepository.createQueryBuilder()
        .update(RefreshToken)
        .set({ isRevoked: true })
        .where('userId = :userId OR stellarAddress = :userId', { userId })
        .execute();
    }
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
