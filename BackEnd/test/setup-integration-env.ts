import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'stellar_earn_test_integration';

// Global test setup for integration tests
global.beforeAll(async () => {
  // Integration test specific setup
  console.log('Setting up integration test environment...');
});

global.afterAll(async () => {
  // Cleanup after all integration tests
  console.log('Cleaning up integration test environment...');
});