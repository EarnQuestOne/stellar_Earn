import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Increase timeout for integration tests
jest.setTimeout(60000);

// Global test utilities for integration tests
global.integrationTestModule = null;

declare global {
  var integrationTestModule: TestingModule | null;
}

// Helper to create integration test module
global.createIntegrationTestModule = async (modules: any[]) => {
  const moduleFixture = await Test.createTestingModule({
    imports: modules,
  }).compile();

  global.integrationTestModule = moduleFixture;
  return moduleFixture;
};

// Helper to get repository from test module
global.getRepository = <T>(entity: new () => T): Repository<T> => {
  if (!global.integrationTestModule) {
    throw new Error('Integration test module not initialized');
  }
  return global.integrationTestModule.get(getRepositoryToken(entity));
};

// Helper to get service from test module
global.getService = <T>(serviceClass: new (...args: any[]) => T): T => {
  if (!global.integrationTestModule) {
    throw new Error('Integration test module not initialized');
  }
  return global.integrationTestModule.get(serviceClass);
};