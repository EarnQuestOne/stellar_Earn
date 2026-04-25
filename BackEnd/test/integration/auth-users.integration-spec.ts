import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { User } from '../../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../../src/modules/auth/entities/refresh-token.entity';

describe('Auth-Users Integration', () => {
  let module: TestingModule;
  let authService: AuthService;
  let usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, RefreshToken],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const userRepository = module.get('UserRepository');
    const refreshTokenRepository = module.get('RefreshTokenRepository');

    await refreshTokenRepository.clear();
    await userRepository.clear();
  });

  describe('Complete Authentication Flow', () => {
    it('should create user and generate tokens through auth flow', async () => {
      const stellarAddress = 'GBTEST123456789012345678901234567890123456789012345678901234567890';
      const signature = 'test_signature';
      const message = 'test_message';

      // Generate challenge (this would normally be called by the client)
      const challenge = await authService.generateChallenge(stellarAddress);

      // Verify signature and login (complete auth flow)
      const authResult = await authService.verifySignatureAndLogin(
        stellarAddress,
        signature,
        message
      );

      // Verify user was created
      const user = await usersService.findByAddress(stellarAddress);
      expect(user).toBeDefined();
      expect(user.stellarAddress).toBe(stellarAddress);

      // Verify tokens were generated
      expect(authResult.accessToken).toBeDefined();
      expect(authResult.refreshToken).toBeDefined();
      expect(authResult.user.stellarAddress).toBe(stellarAddress);
    });

    it('should handle user stats updates through auth interactions', async () => {
      const stellarAddress = 'GBTEST123456789012345678901234567890123456789012345678901234567891';

      // First auth
      await authService.verifySignatureAndLogin(stellarAddress, 'sig1', 'msg1');
      let user = await usersService.findByAddress(stellarAddress);
      const initialLoginCount = user.loginCount;

      // Second auth (should increment login count)
      await authService.verifySignatureAndLogin(stellarAddress, 'sig2', 'msg2');
      user = await usersService.findByAddress(stellarAddress);

      expect(user.loginCount).toBe(initialLoginCount + 1);
    });

    it('should integrate user profile updates with auth tokens', async () => {
      const stellarAddress = 'GBTEST123456789012345678901234567890123456789012345678901234567892';

      // Authenticate user
      const authResult = await authService.verifySignatureAndLogin(
        stellarAddress,
        'signature',
        'message'
      );

      // Update user profile using the authenticated context
      const updatedUser = await usersService.updateProfile(authResult.user.id, {
        displayName: 'Test User',
        bio: 'Integration test user',
      });

      expect(updatedUser.displayName).toBe('Test User');
      expect(updatedUser.bio).toBe('Integration test user');
      expect(updatedUser.stellarAddress).toBe(stellarAddress);
    });
  });

  describe('Cross-Module Data Consistency', () => {
    it('should maintain data consistency between auth and users modules', async () => {
      const stellarAddress = 'GBTEST123456789012345678901234567890123456789012345678901234567893';

      // Create user through auth flow
      await authService.verifySignatureAndLogin(stellarAddress, 'sig', 'msg');
      const userFromAuth = await usersService.findByAddress(stellarAddress);

      // Verify user exists and has correct data
      expect(userFromAuth).toBeDefined();
      expect(userFromAuth.stellarAddress).toBe(stellarAddress);
      expect(userFromAuth.createdAt).toBeDefined();
      expect(userFromAuth.lastLoginAt).toBeDefined();

      // Update user through users service
      const updatedUser = await usersService.updateProfile(userFromAuth.id, {
        displayName: 'Updated Name',
      });

      // Verify auth service can still find the user
      const userFromUsers = await usersService.findByAddress(stellarAddress);
      expect(userFromUsers.displayName).toBe('Updated Name');
      expect(userFromUsers.id).toBe(userFromAuth.id);
    });
  });
});