import { DataSource } from 'typeorm';
import { User } from './src/modules/users/entities/user.entity';
import { Quest } from './src/modules/quests/entities/quest.entity';
import { Submission } from './src/modules/submissions/entities/submission.entity';
import { Notification } from './src/modules/notifications/entities/notification.entity';
import { Payout } from './src/modules/payouts/entities/payout.entity';
import { RefreshToken } from './src/modules/auth/entities/refresh-token.entity';
import { AnalyticsSnapshot } from './src/modules/analytics/entities/analytics-snapshot.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [
    User,
    Quest,
    Submission,
    Notification,
    Payout,
    RefreshToken,
    AnalyticsSnapshot,
  ],
  migrations: ['./src/database/migrations/**/*{.ts,.js}'],
  synchronize: false, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
});