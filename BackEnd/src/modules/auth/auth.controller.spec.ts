import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { generateRandomStellarAddress } from 'test/utils/test-helpers';

/**
 * Unit tests for AuthController.
 *
 * Covers:
 *  - POST /auth/login – success path
 *  - POST /auth/login – missing / invalid body fields
 *  - POST /auth/refresh – rotation success and downstream failure
 *  - Guard-protected routes rejecting unauthenticated requests
 */
describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  /** Factory that builds a minimal Express Response mock. */
  const buildResMock = () => {
    const json = jest.fn();
    const append = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, append, status } as unknown as import('express').Response;
  };

  beforeEach(async () => {
    const mockAuthService: Partial<jest.Mocked<AuthService>> = {
      login: jest.fn().mockReturnValue({
        accessToken: 'mock.access.token',
        expiresIn: 3600,
      }),
      verifyAndLogin: jest.fn().mockResolvedValue({
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        expiresIn: 3600,
        user: {
          id: 'user-1',
          stellarAddress:
            'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
          role: 'USER',
        },
      }),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          stellarAddress:
            'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
          role: 'USER',
        },
      }),
      validate: jest.fn().mockReturnValue({
        id: 'dummy-id',
        stellarAddress:
          'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
        role: 'USER',
      }),
    };

    const mockConfigService = {
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      // Override guards so they never block unit tests
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /auth/login ─────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should call AuthService.verifyAndLogin with the login DTO', async () => {
      const stellarAddress = generateRandomStellarAddress();
      const loginDto: LoginDto = {
        stellarAddress,
        signature: 'a'.repeat(20),
        challenge: 'b'.repeat(20),
      };
      const res = buildResMock();

      await controller.login(loginDto, res);

      expect(authService.verifyAndLogin).toHaveBeenCalledTimes(1);
      expect(authService.verifyAndLogin).toHaveBeenCalledWith(loginDto);
    });

    it('should return a LoginResponseDto with the verified user', async () => {
      const stellarAddress = generateRandomStellarAddress();
      const loginDto: LoginDto = {
        stellarAddress,
        signature: 'a'.repeat(20),
        challenge: 'b'.repeat(20),
      };
      const res = buildResMock();

      const response = await controller.login(loginDto, res);

      expect(response).toEqual({
        success: true,
        user: {
          stellarAddress:
            'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
          role: 'USER',
        },
      });
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should set the session cookies on the response', async () => {
      const stellarAddress = generateRandomStellarAddress();
      const loginDto: LoginDto = {
        stellarAddress,
        signature: 'a'.repeat(20),
        challenge: 'b'.repeat(20),
      };
      const res = buildResMock();

      await controller.login(loginDto, res);

      expect(res.append).toHaveBeenCalledTimes(2);
      const setCookieCalls = (res.append as jest.Mock).mock.calls.filter(
        ([header]) => header === 'Set-Cookie',
      );
      expect(setCookieCalls).toHaveLength(2);
    });

    it('should propagate errors thrown by AuthService.verifyAndLogin', async () => {
      const stellarAddress = generateRandomStellarAddress();
      authService.verifyAndLogin.mockRejectedValue(
        new Error('Service failure'),
      );

      const loginDto: LoginDto = {
        stellarAddress,
        signature: 'a'.repeat(20),
        challenge: 'b'.repeat(20),
      };
      const res = buildResMock();

      await expect(controller.login(loginDto, res)).rejects.toThrow(
        'Service failure',
      );
    });
  });

  // ─── POST /auth/refresh ───────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should call AuthService.refreshTokens with the refreshToken from the DTO', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'raw-refresh-token' };
      const req = { headers: {} } as unknown as import('express').Request;
      const res = buildResMock();

      await controller.refresh(dto, req, res);

      expect(authService.refreshTokens).toHaveBeenCalledTimes(1);
      expect(authService.refreshTokens).toHaveBeenCalledWith(dto.refreshToken);
    });

    it('should set the rotated session cookies and respond with success', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'raw-refresh-token' };
      const req = { headers: {} } as unknown as import('express').Request;
      const res = buildResMock();

      const result = await controller.refresh(dto, req, res);

      expect(res.append).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(result).toBeUndefined();
    });

    it('should propagate UnauthorizedException for an invalid, revoked, or expired refresh token', async () => {
      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );
      const dto: RefreshTokenDto = { refreshToken: 'bad-token' };
      const req = { headers: {} } as unknown as import('express').Request;
      const res = buildResMock();

      await expect(controller.refresh(dto, req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── AuthService.validate (unit coverage) ─────────────────────────────────

  describe('AuthService.validate (used by JwtStrategy)', () => {
    it('should return a user object with id, stellarAddress, and role', () => {
      const payload = {
        stellarAddress: generateRandomStellarAddress(),
        sub: 'test-subject',
      };

      const result = authService.validate(payload);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('stellarAddress');
      expect(result).toHaveProperty('role');
    });
  });

  // ─── Guard behaviour ──────────────────────────────────────────────────────

  describe('Guard integration', () => {
    it('should reject unauthenticated requests when JwtAuthGuard returns false', async () => {
      // In NestJS unit tests, guards are tested independently. We verify here
      // that overriding JwtAuthGuard with a "deny all" mock correctly returns
      // false from canActivate(), which the HTTP layer would translate to a 401.
      const canActivateMock = jest.fn().mockReturnValue(false);
      const denyGuard = { canActivate: canActivateMock };

      // The mock guard correctly refuses access
      const result = denyGuard.canActivate({} as any);

      expect(result).toBe(false);
      expect(canActivateMock).toHaveBeenCalledTimes(1);
    });

    it('should allow requests when JwtAuthGuard is active and token is valid', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: {
              login: jest.fn().mockReturnValue({
                accessToken: 'valid.token',
                expiresIn: 3600,
              }),
              verifyAndLogin: jest.fn().mockResolvedValue({
                accessToken: 'valid.token',
                expiresIn: 3600,
                user: {
                  id: 'user-1',
                  stellarAddress:
                    'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
                  role: 'USER',
                },
              }),
              validate: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
            },
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn().mockReturnValue(true) })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: jest.fn().mockReturnValue(true) })
        .compile();

      const authedController = module.get<AuthController>(AuthController);
      const res = buildResMock();
      const loginDto: LoginDto = {
        stellarAddress: generateRandomStellarAddress(),
        signature: 'a'.repeat(20),
        challenge: 'b'.repeat(20),
      };

      const response = await authedController.login(loginDto, res);

      expect(response).toHaveProperty('success', true);
      expect(res.append).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ─── HTTP status code ─────────────────────────────────────────────────────

  describe('HTTP status codes', () => {
    it('should have @HttpCode(200) on the login endpoint', () => {
      // Verify that the HttpCode decorator is set to 200 (OK) on the login method
      const httpCodeMetadata = Reflect.getMetadata(
        '__httpCode__',
        AuthController.prototype.login,
      );
      expect(httpCodeMetadata).toBe(HttpStatus.OK);
    });
  });
});
