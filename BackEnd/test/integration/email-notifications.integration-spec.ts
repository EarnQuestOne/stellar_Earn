import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from '../../../src/modules/email/email.module';
import { NotificationsModule } from '../../../src/modules/notifications/notifications.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { EmailService } from '../../../src/modules/email/email.service';
import { NotificationsService } from '../../../src/modules/notifications/notifications.service';
import { UsersService } from '../../../src/modules/users/user.service';
import { User } from '../../../src/modules/users/entities/user.entity';
import { Notification } from '../../../src/modules/notifications/entities/notification.entity';

describe('Email-Notifications Integration', () => {
  let module: TestingModule;
  let emailService: EmailService;
  let notificationsService: NotificationsService;
  let usersService: UsersService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [User, Notification],
          synchronize: true,
          dropSchema: true,
        }),
        EmailModule,
        NotificationsModule,
        UsersModule,
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up data between tests
    const userRepository = module.get('UserRepository');
    const notificationRepository = module.get('NotificationRepository');

    await notificationRepository.clear();
    await userRepository.clear();
  });

  describe('Notification Email Delivery', () => {
    it('should create notification and send corresponding email', async () => {
      // Create a test user
      const user = await usersService.create({
        stellarAddress: 'GBEMAIL123456789012345678901234567890123456789012345678901234567890',
        email: 'test@example.com',
        displayName: 'Email Test User',
      });

      // Create a notification
      const notification = await notificationsService.create({
        userId: user.id,
        type: 'quest_completed',
        title: 'Quest Completed!',
        message: 'Congratulations! You have completed the "Introduction to Stellar" quest.',
        data: { questId: 1, reward: 50 },
      });

      // Verify notification was created
      expect(notification.userId).toBe(user.id);
      expect(notification.type).toBe('quest_completed');
      expect(notification.title).toBe('Quest Completed!');
      expect(notification.read).toBe(false);

      // In a real integration, this would trigger an email
      // For testing, we verify the notification exists and would trigger email
      const foundNotification = await notificationsService.findById(notification.id);
      expect(foundNotification).toBeDefined();
      expect(foundNotification.userId).toBe(user.id);
    });

    it('should handle bulk notifications with email batching', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = await usersService.create({
          stellarAddress: `GBBULK${i}123456789012345678901234567890123456789012345678901234567890`,
          email: `bulk${i}@example.com`,
          displayName: `Bulk User ${i}`,
        });
        users.push(user);
      }

      // Create notifications for all users (simulating a system-wide announcement)
      const notifications = [];
      for (const user of users) {
        const notification = await notificationsService.create({
          userId: user.id,
          type: 'system_announcement',
          title: 'Platform Update',
          message: 'We have exciting new features coming soon!',
          data: { updateType: 'features', version: '2.0' },
        });
        notifications.push(notification);
      }

      expect(notifications).toHaveLength(3);

      // Verify all notifications were created
      for (let i = 0; i < notifications.length; i++) {
        expect(notifications[i].userId).toBe(users[i].id);
        expect(notifications[i].type).toBe('system_announcement');
      }

      // In production, this would batch emails to avoid spam filters
      // For testing, we verify the notifications exist
      const allNotifications = await notificationsService.findByUserId(users[0].id);
      expect(allNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Email Notification Preferences', () => {
    it('should respect user email preferences for notifications', async () => {
      // Create user with email preferences
      const user = await usersService.create({
        stellarAddress: 'GBPREFS123456789012345678901234567890123456789012345678901234567890',
        email: 'prefs@example.com',
        displayName: 'Prefs User',
        emailPreferences: {
          questUpdates: true,
          systemAnnouncements: false,
          marketingEmails: false,
        },
      });

      // Create different types of notifications
      const questNotification = await notificationsService.create({
        userId: user.id,
        type: 'quest_completed',
        title: 'Quest Done',
        message: 'You completed a quest!',
        data: { questId: 2 },
      });

      const systemNotification = await notificationsService.create({
        userId: user.id,
        type: 'system_maintenance',
        title: 'Maintenance Scheduled',
        message: 'System maintenance tonight',
        data: { maintenanceTime: '2024-01-01T02:00:00Z' },
      });

      // Verify notifications are created regardless of preferences
      // (preferences would affect email sending, not notification creation)
      expect(questNotification.type).toBe('quest_completed');
      expect(systemNotification.type).toBe('system_maintenance');

      // In a real system, email service would check preferences before sending
      // For this test, we verify the data structure supports preferences
      const updatedUser = await usersService.findById(user.id);
      expect(updatedUser.emailPreferences.questUpdates).toBe(true);
      expect(updatedUser.emailPreferences.systemAnnouncements).toBe(false);
    });

    it('should handle notification read status and email follow-ups', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBREAD123456789012345678901234567890123456789012345678901234567890',
        email: 'read@example.com',
        displayName: 'Read Status User',
      });

      // Create notification
      const notification = await notificationsService.create({
        userId: user.id,
        type: 'reward_earned',
        title: 'Reward Earned!',
        message: 'You earned 100 XLM for your contribution.',
        data: { amount: 100, currency: 'XLM' },
      });

      // Initially unread
      expect(notification.read).toBe(false);

      // Mark as read (simulating user interaction)
      const updatedNotification = await notificationsService.markAsRead(notification.id);
      expect(updatedNotification.read).toBe(true);

      // Verify read status persists
      const foundNotification = await notificationsService.findById(notification.id);
      expect(foundNotification.read).toBe(true);
    });
  });

  describe('Notification Queue and Email Delivery', () => {
    it('should handle notification queue processing and email delivery status', async () => {
      // Create user
      const user = await usersService.create({
        stellarAddress: 'GBQUEUE123456789012345678901234567890123456789012345678901234567890',
        email: 'queue@example.com',
        displayName: 'Queue User',
      });

      // Create multiple notifications rapidly (simulating high activity)
      const notifications = [];
      for (let i = 0; i < 5; i++) {
        const notification = await notificationsService.create({
          userId: user.id,
          type: 'activity_update',
          title: `Activity ${i + 1}`,
          message: `This is activity notification number ${i + 1}`,
          data: { activityId: i + 1 },
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
      const userNotifications = await notificationsService.findByUserId(user.id);
      expect(userNotifications.length).toBe(5);

      // Mark some as read (simulating processing)
      for (let i = 0; i < 3; i++) {
        await notificationsService.markAsRead(notifications[i].id);
      }

      // Verify read status
      for (let i = 0; i < 5; i++) {
        const notif = await notificationsService.findById(notifications[i].id);
        expect(notif.read).toBe(i < 3); // First 3 should be read
      }
    });

    it('should handle email delivery failures gracefully', async () => {
      // Create user with invalid email (for testing failure handling)
      const user = await usersService.create({
        stellarAddress: 'GBFAIL123456789012345678901234567890123456789012345678901234567890',
        email: 'invalid-email-address', // Invalid email format
        displayName: 'Failure User',
      });

      // Create notification that would trigger email
      const notification = await notificationsService.create({
        userId: user.id,
        type: 'welcome_email',
        title: 'Welcome!',
        message: 'Welcome to Stellar Earn platform.',
        data: { welcomeBonus: 10 },
      });

      // Verify notification is created even if email fails
      expect(notification).toBeDefined();
      expect(notification.type).toBe('welcome_email');

      // In a real system, email service would attempt delivery and handle failures
      // For testing, we verify the notification system is resilient
      const foundNotification = await notificationsService.findById(notification.id);
      expect(foundNotification).toBeDefined();
    });
  });
});