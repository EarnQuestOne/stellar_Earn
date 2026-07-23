import { randomBytes } from 'crypto';
import { Keypair, StrKey } from 'stellar-sdk';
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

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/earnquest';

process.env.SOROBAN_SECRET_KEY ??= Keypair.random().secret();
process.env.CONTRACT_ID ??= StrKey.encodeContract(randomBytes(32));

process.env.RATE_LIMIT_LIMIT ??= '100';
process.env.RATE_LIMIT_TTL ??= '60';
process.env.RATE_LIMIT_AUTH_LIMIT ??= '20';
process.env.RATE_LIMIT_AUTH_TTL ??= '60';

process.env.SENDGRID_API_KEY ??= '';
process.env.EMAIL_FROM_ADDRESS ??= 'test@stellarearn.com';
process.env.EMAIL_FROM_NAME ??= 'Stellar Earn Test';
process.env.APP_URL ??= 'http://localhost:3000';
