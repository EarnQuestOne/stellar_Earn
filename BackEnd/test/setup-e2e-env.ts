import { randomBytes } from 'crypto';
import { Keypair, StrKey } from 'stellar-sdk';

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??=
  'postgres://user:pass@localhost:5432/earnquest';

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