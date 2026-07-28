import 'reflect-metadata';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load test environment variables
config({ path: '.env.test' });

const privateKeyPath = join(__dirname, '../jwt-keys.pem');
const publicKeyPath = join(__dirname, '../jwt-keys.pub');
const outputPath = join(__dirname, '../jwt-keys-output.txt');

if (existsSync(outputPath)) {
  const content = readFileSync(outputPath, 'utf8');
  const privateKeyMatch = content.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  const publicKeyMatch = content.match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/);
  if (privateKeyMatch) {
    process.env.JWT_PRIVATE_KEY ??= privateKeyMatch[0];
  }
  if (publicKeyMatch) {
    process.env.JWT_PUBLIC_KEY ??= publicKeyMatch[0];
  }
}

if (existsSync(privateKeyPath)) {
  process.env.JWT_PRIVATE_KEY ??= readFileSync(privateKeyPath, 'utf8');
}
if (existsSync(publicKeyPath)) {
  process.env.JWT_PUBLIC_KEY ??= readFileSync(publicKeyPath, 'utf8');
}

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'stellar_earn_test_integration';

// Note: `setupFiles` run before Jest's test framework is installed,
// so lifecycle hooks like `beforeAll` are not available here.
