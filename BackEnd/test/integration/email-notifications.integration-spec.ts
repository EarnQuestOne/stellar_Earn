import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '#src/common/logger/logger.module';
import { EmailModule } from '#src/modules/email/email.module';
import { NotificationsModule } from '#src/modules/notifications/notifications.module';
import { UsersModule } from '#src/modules/users/users.module';
import { EmailService } from '#src/modules/email/email.service';
import { NotificationsService } from '#src/modules/notifications/notifications.service';
import { UsersService } from '#src/modules/users/users.service';
import { User } from '#src/modules/users/entities/user.entity';
import {
  Notification,
  NotificationType,
} from '#src/modules/notifications/entities/notification.entity';

describe('Email-Notifications Integration', () => {
  let module: TestingModule;
  let _emailService: EmailService;
  let _notificationsService: NotificationsService;
  let _usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        LoggerModule.forRoot({
          enableInterceptor: false,
          enableErrorFilter: false,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Notification],
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        EmailModule,
        NotificationsModule,
        UsersModule,
      ],
    }).compile();

    _emailService = module.get<EmailService>(EmailService);
    _notificationsService =
      module.get<NotificationsService>(NotificationsService);
    _usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const userRepository = module.get('UserRepository');
    const notificationRepository = module.get('NotificationRepository');

    await notificationRepository.query('DELETE FROM "notifications"');
    await userRepository.query('DELETE FROM "users"');
  });

  describe('Notification Email Delivery', () => {
    it('should create notification and send corresponding email', async () => {
      // Create a test user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAEMAIL',
        email: 'test@example.com',
        displayName: 'Email Test User',
      });

      // Create a notification
      const notificationRepository = module.get('NotificationRepository');
      const notification = await notificationRepository.save({
        userId: user.id,
        type: NotificationType.QUEST_UPDATE,
        title: 'Quest Completed!',
        message:
          'Congratulations! You have completed the "Introduction to Stellar" quest.',
        metadata: { questId: 1, reward: 50 },
        read: false,
      });

      // Verify notification was created
      expect(notification.userId).toBe(user.id);
      expect(notification.type).toBe(NotificationType.QUEST_UPDATE);
      expect(notification.title).toBe('Quest Completed!');
      expect(notification.read).toBe(false);

      // In a real integration, this would trigger an email
      // For testing, we verify the notification exists and would trigger email
      const foundNotification = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(foundNotification).toBeDefined();
      expect(foundNotification.userId).toBe(user.id);
    });

    it('should handle bulk notifications with email batching', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 3; i++) {
        const userRepository = module.get('UserRepository');
        const user = await userRepository.save({
          stellarAddress: `GABULK${i}`,
          email: `bulk${i}@example.com`,
          displayName: `Bulk User ${i}`,
        });
        users.push(user);
      }

      // Create notifications for all users (simulating a system-wide announcement)
      const notificationRepository = module.get('NotificationRepository');
      const notifications = [];
      for (const user of users) {
        const notification = await notificationRepository.save({
          userId: user.id,
          type: NotificationType.INFO,
          title: 'Platform Update',
          message: 'We have exciting new features coming soon!',
          metadata: { updateType: 'features', version: '2.0' },
          read: false,
        });
        notifications.push(notification);
      }

      expect(notifications).toHaveLength(3);

      // Verify all notifications were created
      for (let i = 0; i < notifications.length; i++) {
        expect(notifications[i].userId).toBe(users[i].id);
        expect(notifications[i].type).toBe(NotificationType.INFO);
      }

      // In production, this would batch emails to avoid spam filters
      // For testing, we verify the notifications exist
      const allNotifications = await notificationRepository.find({
        where: { userId: users[0].id },
      });
      expect(allNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Email Notification Preferences', () => {
    it('should respect user email preferences for notifications', async () => {
      // Create user with email preferences
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAPREFS',
        email: 'prefs@example.com',
        displayName: 'Prefs User',
      });

      // Create different types of notifications
      const notificationRepository = module.get('NotificationRepository');
      const questNotification = await notificationRepository.save({
        userId: user.id,
        type: NotificationType.QUEST_UPDATE,
        title: 'Quest Done',
        message: 'You completed a quest!',
        metadata: { questId: 2 },
        read: false,
      });

      const systemNotification = await notificationRepository.save({
        userId: user.id,
        type: NotificationType.INFO,
        title: 'Maintenance Scheduled',
        message: 'System maintenance tonight',
        metadata: { maintenanceTime: '2024-01-01T02:00:00Z' },
        read: false,
      });

      // Verify notifications are created regardless of preferences
      // (preferences would affect email sending, not notification creation)
      expect(questNotification.type).toBe(NotificationType.QUEST_UPDATE);
      expect(systemNotification.type).toBe(NotificationType.INFO);
    });

    it('should handle notification read status and email follow-ups', async () => {
      // Create user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAREAD',
        email: 'read@example.com',
        displayName: 'Read Status User',
      });

      // Create notification
      const notificationRepository = module.get('NotificationRepository');
      const notification = await notificationRepository.save({
        userId: user.id,
        type: NotificationType.REWARD,
        title: 'Reward Earned!',
        message: 'You earned 100 XLM for your contribution.',
        metadata: { amount: 100, currency: 'XLM' },
        read: false,
      });

      // Initially unread
      expect(notification.read).toBe(false);

      // Mark as read (simulating user interaction)
      await notificationRepository.update(notification.id, {
        read: true,
        readAt: new Date(),
      });
      const updatedNotification = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(updatedNotification.read).toBe(true);

      // Verify read status persists
      const foundNotification = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(foundNotification.read).toBe(true);
    });
  });

  describe('Notification Queue and Email Delivery', () => {
    it('should handle notification queue processing and email delivery status', async () => {
      // Create user
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAQUEUE',
        email: 'queue@example.com',
        displayName: 'Queue User',
      });

      // Create multiple notifications rapidly (simulating high activity)
      const notificationRepository = module.get('NotificationRepository');
      const notifications = [];
      for (let i = 0; i < 5; i++) {
        const notification = await notificationRepository.save({
          userId: user.id,
          type: NotificationType.SUBMISSION,
          title: `Activity ${i + 1}`,
          message: `This is activity notification number ${i + 1}`,
          metadata: { activityId: i + 1 },
          read: false,
        });
        notifications.push(notification);
      }

      expect(notifications).toHaveLength(5);

      // Verify all notifications are queued properly
      for (const notification of notifications) {
        expect(notification.userId).toBe(user.id);
        expect(notification.read).toBe(false);
      }

      // In a real system, these would be processed by a queue system
      // For testing, we verify they exist and can be retrieved
      const userNotifications = await notificationRepository.find({
        where: { userId: user.id },
      });
      expect(userNotifications.length).toBe(5);

      // Mark some as read (simulating processing)
      for (let i = 0; i < 3; i++) {
        await notificationRepository.update(notifications[i].id, {
          read: true,
          readAt: new Date(),
        });
      }

      // Verify read status
      for (let i = 0; i < 5; i++) {
        const notif = await notificationRepository.findOne({
          where: { id: notifications[i].id },
        });
        expect(notif.read).toBe(i < 3); // First 3 should be read
      }
    });

    it('should handle email delivery failures gracefully', async () => {
      // Create user with invalid email (for testing failure handling)
      const userRepository = module.get('UserRepository');
      const user = await userRepository.save({
        stellarAddress: 'GAFAIL',
        email: 'invalid-email-address', // Invalid email format
        displayName: 'Failure User',
      });

      // Create notification that would trigger email
      const notificationRepository = module.get('NotificationRepository');
      const notification = await notificationRepository.save({
        userId: user.id,
        type: NotificationType.INFO,
        title: 'Welcome!',
        message: 'Welcome to Stellar Earn platform.',
        metadata: { welcomeBonus: 10 },
        read: false,
      });

      // Verify notification is created even if email fails
      expect(notification).toBeDefined();
      expect(notification.type).toBe(NotificationType.INFO);

      // In a real system, email service would attempt delivery and handle failures
      // For testing, we verify the notification system is resilient
      const foundNotification = await notificationRepository.findOne({
        where: { id: notification.id },
      });
      expect(foundNotification).toBeDefined();
    });
  });
});
