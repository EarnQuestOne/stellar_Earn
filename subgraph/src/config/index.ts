// =============================================================================
// Configuration — loaded from environment variables with sensible defaults
// =============================================================================

import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  /** Soroban RPC endpoint */
  rpcUrl: process.env.RPC_URL || 'https://soroban-testnet.stellar.org',

  /** EarnQuest contract ID (C... address) */
  contractId: process.env.CONTRACT_ID || '',

  /** Network passphrase */
  networkPassphrase:
    process.env.NETWORK_PASSPHRASE ||
    'Test SDF Network ; September 2015',

  /** Polling interval in milliseconds for new ledgers */
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),

  /** Maximum ledgers to query per RPC call (Soroban limit: 200) */
  ledgersPerPage: parseInt(process.env.LEDGERS_PER_PAGE || '200', 10),

  /** Start ledger — 0 = auto-detect from latest */
  startLedger: parseInt(process.env.START_LEDGER || '0', 10),

  /** SQLite database path */
  dbPath: process.env.DB_PATH || './data/earn-quest-subgraph.db',

  /** GraphQL API port */
  apiPort: parseInt(process.env.API_PORT || '4000', 10),

  /** Log level */
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

/** Validate required config at startup */
export function validateConfig(): void {
  if (!config.contractId) {
    throw new Error(
      'CONTRACT_ID is required. Set it in .env or environment variables.',
    );
  }
  if (!/^C[A-Z0-9]{55}$/.test(config.contractId)) {
    console.warn(
      `Warning: CONTRACT_ID "${config.contractId}" does not look like a valid Soroban contract address.`,
    );
  }
}
