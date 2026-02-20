import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security Components Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should start application with security components', () => {
    expect(app).toBeDefined();
  });

  // Test that the application can handle basic requests
  it('should respond to requests', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404); // Should return 404 for non-existent route
  });
});