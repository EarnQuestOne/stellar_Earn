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
import { UserRole } from './enums/user-role.enum';
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

export interface AuthUser {
  id: string;
  stellarAddress: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
    const tokens = await this.generateTokens(stellarAddress, role);

    return {
      ...tokens,
      user: this.mapToUserResponse(stellarAddress, role),
    };
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(
    stellarAddress: string,
    role: UserRole,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: stellarAddress,
      stellarAddress,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRATION',
        '15m',
      ),
    } as any);

    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenExpiration = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRATION',
      '7d',
    );

    const expirationMs = this.parseExpirationToMs(refreshTokenExpiration);
    const expiresAt = new Date(Date.now() + expirationMs);

    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      stellarAddress,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
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

    const role = this.getRoleForAddress(refreshToken.stellarAddress);
    const tokens = await this.generateTokens(refreshToken.stellarAddress, role);

    return {
      ...tokens,
      user: this.mapToUserResponse(refreshToken.stellarAddress, role),
    };
  }

  /**
   * Revoke a specific refresh token or all user tokens
   */
  async revokeToken(stellarAddress: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      const token = await this.refreshTokenRepository.findOne({
        where: { id: tokenId, stellarAddress },
      });

      if (!token) {
        throw new NotFoundException('Token not found');
      }

      token.isRevoked = true;
      await this.refreshTokenRepository.save(token);
    } else {
      await this.refreshTokenRepository.update(
        { stellarAddress, isRevoked: false },
        { isRevoked: true },
      );
    }
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(stellarAddress: string): Promise<AuthUser> {
    const role = this.getRoleForAddress(stellarAddress);
    return {
      id: stellarAddress,
      stellarAddress,
      role,
    };
  }

  /**
   * Get role for a Stellar address based on configuration
   */
  private getRoleForAddress(stellarAddress: string): UserRole {
    const adminAddresses = this.configService
      .get<string>('ADMIN_ADDRESSES', '')
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    return adminAddresses.includes(stellarAddress)
      ? UserRole.ADMIN
      : UserRole.USER;
  }

  /**
   * Map to user response DTO
   */
  private mapToUserResponse(
    stellarAddress: string,
    role: UserRole,
  ): UserResponseDto {
    return {
      stellarAddress,
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
