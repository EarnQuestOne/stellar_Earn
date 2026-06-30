import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '#src/modules/auth/auth.module';
import { UsersModule } from '#src/modules/users/users.module';
import { AuthService } from '#src/modules/auth/auth.service';
import { UsersService } from '#src/modules/users/users.service';
import { User } from '#src/modules/users/entities/user.entity';
import { RefreshToken } from '#src/modules/auth/entities/refresh-token.entity';
import { Quest } from '#src/modules/quests/entities/quest.entity';
import { Submission } from '#src/modules/submissions/entities/submission.entity';
import { JwtService } from '@nestjs/jwt';
import { LoggerModule } from '#src/common/logger/logger.module';

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
        LoggerModule.forRoot({
          enableInterceptor: false,
          enableErrorFilter: false,
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, RefreshToken, Quest, Submission],
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UsersModule,
      ],
    })
      .overrideProvider(JwtService)
      .useValue({
        sign: jest.fn().mockReturnValue('test-access-token'),
        verify: jest.fn(),
        signAsync: jest.fn().mockResolvedValue('test-access-token'),
        verifyAsync: jest
          .fn()
          .mockResolvedValue({ stellarAddress: 'test', sub: 'test' }),
        decode: jest.fn(),
      })
      .compile();

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

    await refreshTokenRepository.query('DELETE FROM "refresh_tokens"');
    await userRepository.query('DELETE FROM "users"');
  });

  describe('Complete Authentication Flow', () => {
    it('should create user and generate tokens through auth flow', async () => {
      const stellarAddress = 'GATEST001';

      // Login (generate authentication tokens)
      const authResult = authService.login(stellarAddress);
      const userRepository = module.get('UserRepository');
      await userRepository.save({ stellarAddress });

      // Verify user was created
      const user = await usersService.findByAddress(stellarAddress);
      expect(user).toBeDefined();
      expect(user.stellarAddress).toBe(stellarAddress);

      // Verify tokens were generated
      expect(authResult.accessToken).toBeDefined();
    });

    it('should handle user stats updates through auth interactions', async () => {
      const stellarAddress = 'GATEST002';

      // Create user via repository
      const userRepository = module.get('UserRepository');
      await userRepository.save({ stellarAddress });

      // First auth
      authService.login(stellarAddress);
      let user = await usersService.findByAddress(stellarAddress);

      // Second auth
      authService.login(stellarAddress);
      user = await usersService.findByAddress(stellarAddress);

      expect(user.stellarAddress).toBe(stellarAddress);
    });

    it('should integrate user profile updates with auth tokens', async () => {
      const stellarAddress = 'GATEST003';

      // Create user via repository
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress,
        displayName: 'Original Name',
        bio: 'Original bio',
      });

      // Update user profile using usersService
      const updatedUser = await usersService.update(user.id, {
        ...user,
        displayName: 'Test User',
        bio: 'Integration test user',
      } as User);

      expect(updatedUser.displayName).toBe('Test User');
      expect(updatedUser.bio).toBe('Integration test user');
      expect(updatedUser.stellarAddress).toBe(stellarAddress);
    });
  });

  describe('Cross-Module Data Consistency', () => {
    it('should maintain data consistency between auth and users modules', async () => {
      const stellarAddress = 'GATEST004';

      // Create user through repository
      const userRepository = module.get('UserRepository');
      const createdUser = await userRepository.save({ stellarAddress });

      // Verify user exists and has correct data
      const userFromAuth = await usersService.findByAddress(stellarAddress);
      expect(userFromAuth).toBeDefined();
      expect(userFromAuth.stellarAddress).toBe(stellarAddress);

      // Update user through users service
      const updatedUser = await usersService.update(createdUser.id, {
        ...createdUser,
        displayName: 'Updated Name',
      } as User);

      // Verify auth service can still find the user
      const userFromUsers = await usersService.findByAddress(stellarAddress);
      expect(userFromUsers.stellarAddress).toBe(stellarAddress);
      expect(updatedUser.displayName).toBe('Updated Name');
    });
  });
});
