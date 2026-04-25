import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/user.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { Role } from '../../common/enums/role.enum';
import {
  createMockRepository,
  createMockUser,
  createMockRefreshToken,
  createMockJwtService,
  createMockConfigService,
  generateRandomStellarAddress,
} from '../../test/utils/test-helpers';

// Mock the signature utilities
jest.mock('./utils/signature', () => ({
  generateChallengeMessage: jest.fn((address, timestamp) => `Challenge for ${address} at ${timestamp}`),
  verifyStellarSignature: jest.fn(),
  isChallengeExpired: jest.fn((timestamp, minutes) => false),
  extractTimestampFromChallenge: jest.fn((challenge) => Date.now()),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let refreshTokenRepository: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    const mockRefreshTokenRepository = createMockRepository<RefreshToken>();
    jwtService = createMockJwtService();
    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'JwtService',
          useValue: jwtService,
        },
        {
          provide: 'ConfigService',
          useValue: configService,
        },
        {
          provide: UsersService,
          useValue: {
            findByAddress: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByGoogleId: jest.fn(),
            findByGithubId: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    })
      .useMocker((token) => {
        if (token === 'JwtService') return jwtService;
        if (token === 'ConfigService') return configService;
        return undefined;
      })
      .compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
  });

  describe('generateChallenge', () => {
    it('should generate a challenge for a valid Stellar address', async () => {
      const stellarAddress = generateRandomStellarAddress();

      const result = await service.generateChallenge(stellarAddress);

      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt instanceof Date).toBe(true);
    });

    it('should set expiration date based on configuration', async () => {
      const stellarAddress = generateRandomStellarAddress();
      const beforeCall = Date.now();

      const result = await service.generateChallenge(stellarAddress);

      const afterCall = Date.now();
      const expectedMinExpiry = beforeCall + 5 * 60 * 1000;
      const expectedMaxExpiry = afterCall + 5 * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', async () => {
      const subject = 'test-user-id';
      const stellarAddress = generateRandomStellarAddress();

      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({
        token: 'refresh-token-value',
      });
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue({
        token: 'refresh-token-value',
      });

      const result = await service.generateTokens(
        subject,
        subject,
        stellarAddress,
        Role.USER,
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.expiresIn).toBe('number');
    });

    it('should save refresh token to repository', async () => {
      const subject = 'test-user-id';
      const stellarAddress = generateRandomStellarAddress();
      const saveSpy = jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue({});

      await service.generateTokens(subject, subject, stellarAddress, Role.USER);

      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should handle null userId and stellarAddress', async () => {
      const subject = generateRandomStellarAddress();

      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({
        token: 'refresh-token-value',
      });
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue({
        token: 'refresh-token-value',
      });

      const result = await service.generateTokens(
        subject,
        null,
        null,
        Role.USER,
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh valid tokens', async () => {
      const user = createMockUser();
      const refreshToken = createMockRefreshToken({
        userId: user.id,
        isRevoked: false,
      });

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(refreshToken);
      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue(refreshToken);
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({
        token: 'new-refresh-token',
      });

      const result = await service.refreshTokens(refreshToken.token);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const refreshToken = createMockRefreshToken({ isRevoked: true });

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(refreshToken);

      await expect(
        service.refreshTokens(refreshToken.token),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const refreshToken = createMockRefreshToken({
        expiresAt: new Date(Date.now() - 1000),
        isRevoked: false,
      });

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(refreshToken);

      await expect(
        service.refreshTokens(refreshToken.token),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke old refresh token when issuing new one', async () => {
      const user = createMockUser();
      const refreshToken = createMockRefreshToken({
        userId: user.id,
        isRevoked: false,
      });

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(refreshToken);
      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      const saveSpy = jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(refreshToken);
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({
        token: 'new-token',
      });

      await service.refreshTokens(refreshToken.token);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: true }),
      );
    });
  });

  describe('revokeToken', () => {
    it('should revoke specific token', async () => {
      const userId = 'test-user-id';
      const tokenId = 'token-id-123';
      const token = createMockRefreshToken({ id: tokenId, userId });

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(token);
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue(token);

      await service.revokeToken(userId, tokenId);

      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: expect.any(Array),
      });
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: true }),
      );
    });

    it('should throw NotFoundException when token not found', async () => {
      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.revokeToken('user-id', 'token-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should revoke all user tokens when tokenId not provided', async () => {
      const userId = 'test-user-id';
      const queryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      jest
        .spyOn(refreshTokenRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      await service.revokeToken(userId);

      expect(queryBuilder.update).toHaveBeenCalledWith(RefreshToken);
      expect(queryBuilder.set).toHaveBeenCalledWith({ isRevoked: true });
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should validate user with UUID', async () => {
      const user = createMockUser();

      jest.spyOn(usersService, 'findById').mockResolvedValue(user);

      const result = await service.validateUser(user.id);

      expect(result).toEqual({
        id: user.id,
        stellarAddress: user.stellarAddress,
        role: user.role,
      });
    });

    it('should validate user with Stellar address', async () => {
      const user = createMockUser();

      jest.spyOn(usersService, 'findByAddress').mockResolvedValue(user);

      const result = await service.validateUser(user.stellarAddress);

      expect(result).toEqual({
        id: user.id,
        stellarAddress: user.stellarAddress,
        role: user.role,
      });
    });

    it('should return user data with USER role for unknown Stellar addresses', async () => {
      const stellarAddress = generateRandomStellarAddress();

      jest
        .spyOn(usersService, 'findByAddress')
        .mockRejectedValue(new Error('Not found'));

      const result = await service.validateUser(stellarAddress);

      expect(result).toEqual({
        id: stellarAddress,
        stellarAddress,
        role: Role.USER,
      });
    });
  });

  describe('loginOAuthUser', () => {
    it('should create or update OAuth user and return tokens', async () => {
      const user = createMockUser();
      const profile = {
        googleId: 'google-123',
        email: 'user@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google' as const,
      };

      jest.spyOn(usersService, 'findByGoogleId').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByGithubId').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'create').mockResolvedValue(user);
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({
        token: 'refresh-token',
      });
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue({ token: 'refresh-token' });

      const result = await service.loginOAuthUser(profile);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should find existing OAuth user by Google ID', async () => {
      const user = createMockUser();
      const profile = {
        googleId: 'google-123',
        email: 'user@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google' as const,
      };

      jest.spyOn(usersService, 'findByGoogleId').mockResolvedValue(user);
      jest.spyOn(usersService, 'create').mockResolvedValue(user);
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({
        token: 'refresh-token',
      });
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue({ token: 'refresh-token' });

      const result = await service.loginOAuthUser(profile);

      expect(usersService.findByGoogleId).toHaveBeenCalledWith('google-123');
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('parseExpirationToMs', () => {
    it('should parse seconds correctly', () => {
      // Access private method for testing
      const result = (service as any).parseExpirationToMs('30s');
      expect(result).toBe(30000);
    });

    it('should parse minutes correctly', () => {
      const result = (service as any).parseExpirationToMs('15m');
      expect(result).toBe(15 * 60 * 1000);
    });

    it('should parse hours correctly', () => {
      const result = (service as any).parseExpirationToMs('2h');
      expect(result).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse days correctly', () => {
      const result = (service as any).parseExpirationToMs('7d');
      expect(result).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should throw error for invalid format', () => {
      expect(() => (service as any).parseExpirationToMs('invalid')).toThrow(
        'Invalid expiration format',
      );
    });
  });
});
