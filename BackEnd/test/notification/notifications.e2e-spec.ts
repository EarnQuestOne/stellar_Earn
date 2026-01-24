import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { NotificationDB } from '../../src/modules/notifications/entities/notification.entity';
import { NotificationPreference } from '../../src/modules/notifications/entities/notificationPreference.entity';
import { NotificationType } from '../../src/modules/notifications/entities/notification.entity';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const userId = 'test-user-id';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // mock auth guard
      .overrideProvider('APP_GUARD')
      .useValue({
        canActivate: (ctx) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { id: userId };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.getRepository(NotificationDB).clear();
    await dataSource.getRepository(NotificationPreference).clear();
  });

  it('GET /notifications → empty list', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .expect(200);

    expect(res.body.notifications).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('creates and fetches notifications', async () => {
    const repo = dataSource.getRepository(NotificationDB);

    await repo.save(
      repo.create({
        userId,
        type: NotificationType.QUEST_UPDATE,
        title: 'Quest Updated',
        message: 'Your quest has changed',
        channels: ['IN_APP'],
        metadata: {},
      })
    );

    const res = await request(app.getHttpServer())
      .get('/notifications')
      .expect(200);

    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].isRead).toBe(false);
  });

  it('GET /notifications/unread/count', async () => {
    const repo = dataSource.getRepository(NotificationDB);

    await repo.save(
      repo.create({
        userId,
        type: NotificationType.REWARD,
        title: 'Reward!',
        message: 'You earned a reward',
        channels: ['IN_APP'],
        metadata: {},
      })
    );

    const res = await request(app.getHttpServer())
      .get('/notifications/unread/count')
      .expect(200);

    expect(res.body.count).toBe(1);
  });

  it('PATCH /notifications/:id/read', async () => {
    const repo = dataSource.getRepository(NotificationDB);

    const notification = await repo.save(
      repo.create({
        userId,
        type: NotificationType.SUBMISSION,
        title: 'Submission',
        message: 'Submission received',
        channels: ['IN_APP'],
        metadata: {},
      })
    );

    const res = await request(app.getHttpServer())
      .patch(`/notifications/${notification.id}/read`)
      .expect(200);

    expect(res.body.isRead).toBe(true);
    expect(res.body.readAt).toBeDefined();
  });

  it('PATCH /notifications/read-all', async () => {
    const repo = dataSource.getRepository(NotificationDB);

    await repo.save([
      repo.create({
        userId,
        type: NotificationType.QUEST_UPDATE,
        title: '1',
        message: '1',
        channels: ['IN_APP'],
        metadata: {},
      }),
      repo.create({
        userId,
        type: NotificationType.REWARD,
        title: '2',
        message: '2',
        channels: ['IN_APP'],
        metadata: {},
      }),
    ]);

    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .expect(200);

    const unreadCount = await repo.count({
      where: { userId, isRead: false },
    });

    expect(unreadCount).toBe(0);
  });

  it('GET + PATCH /notifications/preferences', async () => {
    const getRes = await request(app.getHttpServer())
      .get('/notifications/preferences')
      .expect(200);

    expect(getRes.body.inApp).toBe(true);

    const updateRes = await request(app.getHttpServer())
      .patch('/notifications/preferences')
      .send({ email: false })
      .expect(200);

    expect(updateRes.body.email).toBe(false);
  });

  it('DELETE /notifications/cleanup', async () => {
    const repo = dataSource.getRepository(NotificationDB);

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);

    await repo.save(
      repo.create({
        userId,
        type: NotificationType.REWARD,
        title: 'Old',
        message: 'Old notification',
        channels: ['IN_APP'],
        metadata: {},
        isRead: true,
        readAt: oldDate,
      })
    );

    const res = await request(app.getHttpServer())
      .delete('/notifications/cleanup?daysOld=30')
      .expect(200);

    expect(res.body.deleted).toBe(1);
  });
});
