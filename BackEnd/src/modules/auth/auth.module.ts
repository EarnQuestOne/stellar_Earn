import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { TwoFactorAuth } from './entities/two-factor.entity';
import { TotpService } from './services/totp.service';
import { TwoFactorService } from './services/two-factor.service';
import { TwoFactorController } from './controllers/two-factor.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),
    JwtModule.registerAsync({
       imports: [ConfigModule],
       useFactory: async (configService: ConfigService) => {
         const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
         if (!privateKey) {
           throw new Error('JWT_PRIVATE_KEY is not defined in environment variables');
         }
         return {
           privateKey,
           signOptions: {
             expiresIn: configService.get<string>(
               'JWT_ACCESS_TOKEN_EXPIRATION',
               '15m',
             ),
             algorithm: 'RS256',
           },
         } as any;
       },
       inject: [ConfigService],
     }),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GithubStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
