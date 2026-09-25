import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

describe('QuestsController (Validation)', () => {
  let app: INestApplication;
  let questsService: Partial<Record<keyof QuestsService, jest.Mock>>;

  beforeEach(async () => {
    questsService = {
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [QuestsController],
      providers: [
        {
          provide: QuestsService,
          useValue: questsService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('UUID Parameter Validation', () => {
    const invalidUuid = 'invalid-uuid-1234';
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('GET /quests/:id - should return 400 Bad Request on malformed UUID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/quests/${invalidUuid}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'Validation failed (uuid is expected)',
      );
      expect(questsService.findOne).not.toHaveBeenCalled();
    });

    it('PATCH /quests/:id - should return 400 Bad Request on malformed UUID', async () => {
      await request(app.getHttpServer())
        .patch(`/quests/${invalidUuid}`)
        .send({ title: 'Updated Quest Title' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(questsService.update).not.toHaveBeenCalled();
    });

    it('DELETE /quests/:id - should return 400 Bad Request on malformed UUID', async () => {
      await request(app.getHttpServer())
        .delete(`/quests/${invalidUuid}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(questsService.remove).not.toHaveBeenCalled();
    });

    it('GET /quests/:id - should delegate to QuestsService when UUID is valid', async () => {
      questsService.findOne.mockResolvedValue({
        id: validUuid,
        title: 'Sample Quest',
      });

      await request(app.getHttpServer())
        .get(`/quests/${validUuid}`)
        .expect(HttpStatus.OK);

      expect(questsService.findOne).toHaveBeenCalledWith(validUuid);
    });
  });
});
