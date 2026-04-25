// import { DataSource } from 'typeorm';
// import { User } from '../modules/users/entities/user.entity';
// import { Quest } from '../modules/quests/entities/quest.entity';
// import { Submission } from '../modules/submissions/entities/submission.entity';
// import { Notification } from '../modules/notifications/entities/notification.entity';
// import { Payout } from '../modules/payouts/entities/payout.entity';
// import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
// import { AnalyticsSnapshot } from '../modules/analytics/entities/analytics-snapshot.entity';

// export default new DataSource({
//   type: 'postgres',
//   url: process.env.DATABASE_URL,
//   // ssl:
//   //   process.env.NODE_ENV === 'production'
//   //     ? { rejectUnauthorized: false }
//   //     : false,
//   ssl: { rejectUnauthorized: false },
//   entities: [
//     User,
//     Quest,
//     Submission,
//     Notification,
//     Payout,
//     RefreshToken,
//     AnalyticsSnapshot,
//   ],
//   migrations: ['./src/database/migrations/**/*{.ts,.js}'],
//   synchronize: false, // Set to false in production
//   logging: process.env.NODE_ENV === 'development',
// });

import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Quest } from '../modules/quests/entities/quest.entity';
import { Submission } from '../modules/submissions/entities/submission.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { Payout } from '../modules/payouts/entities/payout.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { AnalyticsSnapshot } from '../modules/analytics/entities/analytics-snapshot.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use your Neon URL with ?sslmode=require
  // For Neon pooled connection, use this SSL configuration:
  ssl: {
    rejectUnauthorized: false,
    // require: true,
  },
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
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  // Add these extra options for Neon
  extra: {
    ssl: { rejectUnauthorized: false, require: true },
    max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
    min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT ?? '10000', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? '30000', 10),
  },
});

