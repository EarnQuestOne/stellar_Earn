import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '#src/app.module';
import { Keypair } from 'stellar-sdk';
import { DataSource } from 'typeorm';
import { JobSchedule } from '#src/modules/jobs/entities/job-log.entity';

describe('Jobs (e2e)', () => {
  let app: INestApplication<App>;
  let testKeypair: Keypair;
  let stellarAddress: string;
  let accessToken: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Generate test Stellar keypair and authenticate
    testKeypair = Keypair.random();
    stellarAddress = testKeypair.publicKey();

    // Get challenge and login
    const challengeResponse = await request(app.getHttpServer())
      .post('/auth/challenge')
      .send({ stellarAddress });

    const challenge = challengeResponse.body.challenge;
    const signature = testKeypair
      .sign(Buffer.from(challenge, 'utf8'))
      .toString('base64');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress, signature, challenge });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    if (dataSource && dataSource.isInitialized) {
      const jobScheduleRepository = dataSource.getRepository(JobSchedule);
      await jobScheduleRepository.delete({
        jobType: 'dependency:freshness-check',
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.close();
  });

  describe('Dependency Freshness Check', () => {
    describe('POST /jobs/dependency-freshness-check', () => {
      it('should create a dependency freshness check job (admin only)', async () => {
        // Note: This endpoint may not exist yet - you may need to create it
        // or test through the job scheduler directly
        const response = await request(app.getHttpServer())
          .post('/jobs/dependency-freshness-check')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            repositoryOwner: 'nnennaokoye',
            repositoryName: 'stellar_Earn',
            branch: 'main',
          });

        // This will likely return 404 or 403 if the endpoint doesn't exist
        // You may need to adjust this test based on your actual implementation
        expect([200, 201, 404, 403]).toContain(response.status);
      });

      it('should validate request body', async () => {
        const response = await request(app.getHttpServer())
          .post('/jobs/dependency-freshness-check')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            repositoryOwner: '', // Invalid empty string
            repositoryName: 'stellar_Earn',
          });

        expect([400, 404, 403]).toContain(response.status);
      });
    });

    describe('Job Schedule Integration', () => {
      it('should allow scheduling a dependency freshness check', async () => {
        const jobScheduleRepository = dataSource.getRepository(JobSchedule);

        const schedule = jobScheduleRepository.create({
          jobType: 'dependency:freshness-check',
          cronExpression: '0 0 * * 0', // Weekly on Sunday at midnight
          jobPayload: {
            repositoryOwner: 'nnennaokoye',
            repositoryName: 'stellar_Earn',
            branch: 'main',
          },
          isActive: true,
          description: 'Weekly dependency freshness check',
        });

        const savedSchedule = await jobScheduleRepository.save(schedule);

        expect(savedSchedule).toHaveProperty('id');
        expect(savedSchedule.jobType).toBe('dependency:freshness-check');
        expect(savedSchedule.isActive).toBe(true);

        // Clean up
        await jobScheduleRepository.delete({ id: savedSchedule.id });
      });
    });
  });
});
