import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Keypair } from 'stellar-sdk';
import { QuestStatus } from '../../src/modules/quests/enums/quest-status.enum';

describe('Quests (e2e)', () => {
    let app: INestApplication<App>;
    let adminKeypair: Keypair;
    let adminAddress: string;
    let adminAccessToken: string;
    let userKeypair: Keypair;
    let userAddress: string;
    let userAccessToken: string;
    let createdQuestId: string;

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

        // Generate test keypairs
        adminKeypair = Keypair.random();
        adminAddress = adminKeypair.publicKey();
        userKeypair = Keypair.random();
        userAddress = userKeypair.publicKey();

        // Login as admin
        const adminChallenge = (
            await request(app.getHttpServer())
                .post('/auth/challenge')
                .send({ stellarAddress: adminAddress })
        ).body.challenge;

        const adminSignature = adminKeypair
            .sign(Buffer.from(adminChallenge, 'utf8'))
            .toString('base64');

        const adminLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                stellarAddress: adminAddress,
                signature: adminSignature,
                challenge: adminChallenge,
            });

        adminAccessToken = adminLoginResponse.body.accessToken;

        // Login as regular user
        const userChallenge = (
            await request(app.getHttpServer())
                .post('/auth/challenge')
                .send({ stellarAddress: userAddress })
        ).body.challenge;

        const userSignature = userKeypair
            .sign(Buffer.from(userChallenge, 'utf8'))
            .toString('base64');

        const userLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                stellarAddress: userAddress,
                signature: userSignature,
                challenge: userChallenge,
            });

        userAccessToken = userLoginResponse.body.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/quests (POST)', () => {
        it('should create a quest with admin token', async () => {
            const createQuestDto = {
                title: 'Complete KYC Verification',
                description: 'Complete the KYC verification process to earn rewards',
                reward: 10.5,
                status: QuestStatus.DRAFT,
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createQuestDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body.title).toBe(createQuestDto.title);
                    expect(res.body.description).toBe(createQuestDto.description);
                    expect(res.body.reward).toBe(createQuestDto.reward);
                    expect(res.body.status).toBe(QuestStatus.DRAFT);
                    expect(res.body.creatorAddress).toBe(adminAddress);
                    expect(res.body.currentCompletions).toBe(0);
                    createdQuestId = res.body.id;
                });
        });

        it('should reject quest creation without admin token', () => {
            const createQuestDto = {
                title: 'Test Quest',
                description: 'This should fail',
                reward: 5.0,
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${userAccessToken}`)
                .send(createQuestDto)
                .expect(403);
        });

        it('should reject quest creation without authentication', () => {
            const createQuestDto = {
                title: 'Test Quest',
                description: 'This should fail',
                reward: 5.0,
            };

            return request(app.getHttpServer())
                .post('/quests')
                .send(createQuestDto)
                .expect(401);
        });

        it('should validate quest title length', () => {
            const createQuestDto = {
                title: 'AB',
                description: 'Valid description here',
                reward: 5.0,
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createQuestDto)
                .expect(400);
        });

        it('should validate quest description length', () => {
            const createQuestDto = {
                title: 'Valid Title',
                description: 'Short',
                reward: 5.0,
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createQuestDto)
                .expect(400);
        });

        it('should validate reward is positive', () => {
            const createQuestDto = {
                title: 'Valid Title',
                description: 'Valid description here',
                reward: -5.0,
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createQuestDto)
                .expect(400);
        });

        it('should create quest with optional fields', () => {
            const createQuestDto = {
                title: 'Quest with Options',
                description: 'This quest has all optional fields',
                reward: 25.0,
                maxCompletions: 100,
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-12-31'),
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createQuestDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body.maxCompletions).toBe(100);
                    expect(res.body.startDate).toBeDefined();
                    expect(res.body.endDate).toBeDefined();
                });
        });

        it('should reject quest with end date before start date', () => {
            const createQuestDto = {
                title: 'Invalid Date Quest',
                description: 'This quest has invalid dates',
                reward: 10.0,
                startDate: new Date('2026-12-31'),
                endDate: new Date('2026-01-01'),
            };

            return request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createQuestDto)
                .expect(400);
        });
    });

    describe('/quests (GET)', () => {
        it('should get all quests with pagination', () => {
            return request(app.getHttpServer())
                .get('/quests')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                    expect(res.body).toHaveProperty('total');
                    expect(res.body).toHaveProperty('page');
                    expect(res.body).toHaveProperty('limit');
                    expect(res.body).toHaveProperty('totalPages');
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });

        it('should filter quests by status', () => {
            return request(app.getHttpServer())
                .get('/quests')
                .query({ status: QuestStatus.DRAFT })
                .expect(200)
                .expect((res) => {
                    res.body.data.forEach((quest: any) => {
                        expect(quest.status).toBe(QuestStatus.DRAFT);
                    });
                });
        });

        it('should filter quests by creator', () => {
            return request(app.getHttpServer())
                .get('/quests')
                .query({ creatorAddress: adminAddress })
                .expect(200)
                .expect((res) => {
                    res.body.data.forEach((quest: any) => {
                        expect(quest.creatorAddress).toBe(adminAddress);
                    });
                });
        });

        it('should filter quests by reward range', () => {
            return request(app.getHttpServer())
                .get('/quests')
                .query({ minReward: 5, maxReward: 15 })
                .expect(200)
                .expect((res) => {
                    res.body.data.forEach((quest: any) => {
                        expect(quest.reward).toBeGreaterThanOrEqual(5);
                        expect(quest.reward).toBeLessThanOrEqual(15);
                    });
                });
        });

        it('should paginate results', () => {
            return request(app.getHttpServer())
                .get('/quests')
                .query({ page: 1, limit: 2 })
                .expect(200)
                .expect((res) => {
                    expect(res.body.page).toBe(1);
                    expect(res.body.limit).toBe(2);
                    expect(res.body.data.length).toBeLessThanOrEqual(2);
                });
        });

        it('should sort quests by different fields', () => {
            return request(app.getHttpServer())
                .get('/quests')
                .query({ sortBy: 'reward', sortOrder: 'ASC' })
                .expect(200);
        });
    });

    describe('/quests/:id (GET)', () => {
        it('should get a single quest by ID', () => {
            return request(app.getHttpServer())
                .get(`/quests/${createdQuestId}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.id).toBe(createdQuestId);
                    expect(res.body).toHaveProperty('title');
                    expect(res.body).toHaveProperty('description');
                    expect(res.body).toHaveProperty('reward');
                });
        });

        it('should return 404 for non-existent quest', () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            return request(app.getHttpServer())
                .get(`/quests/${fakeId}`)
                .expect(404);
        });
    });

    describe('/quests/:id (PATCH)', () => {
        it('should update quest by owner', () => {
            const updateDto = {
                title: 'Updated Quest Title',
                reward: 15.0,
            };

            return request(app.getHttpServer())
                .patch(`/quests/${createdQuestId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(updateDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body.title).toBe(updateDto.title);
                    expect(res.body.reward).toBe(updateDto.reward);
                });
        });

        it('should allow valid status transition (DRAFT to ACTIVE)', () => {
            const updateDto = {
                status: QuestStatus.ACTIVE,
            };

            return request(app.getHttpServer())
                .patch(`/quests/${createdQuestId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(updateDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe(QuestStatus.ACTIVE);
                });
        });

        it('should allow valid status transition (ACTIVE to COMPLETED)', () => {
            const updateDto = {
                status: QuestStatus.COMPLETED,
            };

            return request(app.getHttpServer())
                .patch(`/quests/${createdQuestId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(updateDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe(QuestStatus.COMPLETED);
                });
        });

        it('should reject invalid status transition', async () => {
            // Create a new quest in ARCHIVED status
            const createDto = {
                title: 'Archived Quest',
                description: 'This quest will be archived',
                reward: 5.0,
                status: QuestStatus.ARCHIVED,
            };

            const createResponse = await request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createDto);

            const archivedQuestId = createResponse.body.id;

            // Try to transition from ARCHIVED to ACTIVE (invalid)
            const updateDto = {
                status: QuestStatus.ACTIVE,
            };

            return request(app.getHttpServer())
                .patch(`/quests/${archivedQuestId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(updateDto)
                .expect(400);
        });

        it('should reject update without authentication', () => {
            const updateDto = {
                title: 'Should Fail',
            };

            return request(app.getHttpServer())
                .patch(`/quests/${createdQuestId}`)
                .send(updateDto)
                .expect(401);
        });

        it('should reject update by non-admin', () => {
            const updateDto = {
                title: 'Should Fail',
            };

            return request(app.getHttpServer())
                .patch(`/quests/${createdQuestId}`)
                .set('Authorization', `Bearer ${userAccessToken}`)
                .send(updateDto)
                .expect(403);
        });
    });

    describe('/quests/:id (DELETE)', () => {
        let questToDelete: string;

        beforeEach(async () => {
            const createDto = {
                title: 'Quest to Delete',
                description: 'This quest will be deleted',
                reward: 5.0,
            };

            const response = await request(app.getHttpServer())
                .post('/quests')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(createDto);

            questToDelete = response.body.id;
        });

        it('should delete quest by owner', () => {
            return request(app.getHttpServer())
                .delete(`/quests/${questToDelete}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(204);
        });

        it('should return 404 after deletion', async () => {
            await request(app.getHttpServer())
                .delete(`/quests/${questToDelete}`)
                .set('Authorization', `Bearer ${adminAccessToken}`);

            return request(app.getHttpServer())
                .get(`/quests/${questToDelete}`)
                .expect(404);
        });

        it('should reject deletion without authentication', () => {
            return request(app.getHttpServer())
                .delete(`/quests/${questToDelete}`)
                .expect(401);
        });

        it('should reject deletion by non-admin', () => {
            return request(app.getHttpServer())
                .delete(`/quests/${questToDelete}`)
                .set('Authorization', `Bearer ${userAccessToken}`)
                .expect(403);
        });

        it('should return 404 for non-existent quest', () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            return request(app.getHttpServer())
                .delete(`/quests/${fakeId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(404);
        });
    });

    describe('Authorization and Ownership', () => {
        it('should prevent admin from updating another admin\'s quest', async () => {
            // Create another admin
            const otherAdminKeypair = Keypair.random();
            const otherAdminAddress = otherAdminKeypair.publicKey();

            const challenge = (
                await request(app.getHttpServer())
                    .post('/auth/challenge')
                    .send({ stellarAddress: otherAdminAddress })
            ).body.challenge;

            const signature = otherAdminKeypair
                .sign(Buffer.from(challenge, 'utf8'))
                .toString('base64');

            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    stellarAddress: otherAdminAddress,
                    signature,
                    challenge,
                });

            const otherAdminToken = loginResponse.body.accessToken;

            // Try to update the first admin's quest
            const updateDto = {
                title: 'Unauthorized Update',
            };

            return request(app.getHttpServer())
                .patch(`/quests/${createdQuestId}`)
                .set('Authorization', `Bearer ${otherAdminToken}`)
                .send(updateDto)
                .expect(403);
        });

        it('should prevent admin from deleting another admin\'s quest', async () => {
            // Create another admin
            const otherAdminKeypair = Keypair.random();
            const otherAdminAddress = otherAdminKeypair.publicKey();

            const challenge = (
                await request(app.getHttpServer())
                    .post('/auth/challenge')
                    .send({ stellarAddress: otherAdminAddress })
            ).body.challenge;

            const signature = otherAdminKeypair
                .sign(Buffer.from(challenge, 'utf8'))
                .toString('base64');

            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    stellarAddress: otherAdminAddress,
                    signature,
                    challenge,
                });

            const otherAdminToken = loginResponse.body.accessToken;

            // Try to delete the first admin's quest
            return request(app.getHttpServer())
                .delete(`/quests/${createdQuestId}`)
                .set('Authorization', `Bearer ${otherAdminToken}`)
                .expect(403);
        });
    });
});
