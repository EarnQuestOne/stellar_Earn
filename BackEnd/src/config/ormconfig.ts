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
    ssl: {
      rejectUnauthorized: false,
      require: true,
    },
    // Connection pool settings
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  },
});

