import { registerAs } from '@nestjs/config';

export default registerAs('stellar', () => ({
  network: process.env.STELLAR_NETWORK || 'testnet',
  rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  horizonUrl: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
  contractId: process.env.CONTRACT_ID,
  // Support both specific and generic secret key env vars
  secretKey:
    process.env.SOROBAN_SECRET_KEY || process.env.STELLAR_SOURCE_SECRET_KEY,
  timeout: parseInt(process.env.STELLAR_TIMEOUT || '30', 10),
  baseFee: parseInt(process.env.STELLAR_BASE_FEE || '100', 10),
  retry: {
    maxAttempts: parseInt(process.env.STELLAR_RETRY_MAX || '3', 10),
    backoffBase: parseInt(process.env.STELLAR_RETRY_BACKOFF || '1000', 10),
  },
}));
