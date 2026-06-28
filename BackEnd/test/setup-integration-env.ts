import 'reflect-metadata';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'stellar_earn_test_integration';

// Note: `setupFiles` run before Jest's test framework is installed,
// so lifecycle hooks like `beforeAll` are not available here.
