import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { QuestsModule } from './modules/quests/quests.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { Payout } from './modules/payouts/entities/payout.entity';
import { Quest } from './modules/quests/entities/quest.entity';
import { User } from './modules/analytics/entities/user.entity';
import { Quest as AnalyticsQuest } from './modules/analytics/entities/quest.entity';
import { Submission } from './modules/analytics/entities/submission.entity';
import { Payout as AnalyticsPayout } from './modules/analytics/entities/payout.entity';
import { AnalyticsSnapshot } from './modules/analytics/entities/analytics-snapshot.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [
          RefreshToken,
          Payout,
          Quest,
          User,
          AnalyticsQuest,
          Submission,
          AnalyticsPayout,
          AnalyticsSnapshot,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get<number>('RATE_LIMIT_MAX', 100),
        },
      ],
      inject: [ConfigService],
    }),
    AuthModule,
    PayoutsModule,
    AnalyticsModule,
    QuestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
