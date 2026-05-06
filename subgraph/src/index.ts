// =============================================================================
// EarnQuest Subgraph — Main Entry Point
// =============================================================================
// Starts the event listener (ingest) and the GraphQL API server.
// =============================================================================

import { initDatabase } from './storage/database';
import { EventListener } from './storage/listener';
import { startApiServer } from './api/server';
import { config, validateConfig } from './config';

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        Stellar EarnQuest Subgraph — Event Indexer            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // Validate configuration
  validateConfig();
  console.log(`[Config] Contract: ${config.contractId}`);
  console.log(`[Config] RPC: ${config.rpcUrl}`);
  console.log(`[Config] DB: ${config.dbPath}`);
  console.log(`[Config] API Port: ${config.apiPort}`);
  console.log();

  // Initialize database
  console.log('[DB] Initializing SQLite database...');
  initDatabase();
  console.log('[DB] Database ready');
  console.log();

  // Start the GraphQL API server
  console.log('[API] Starting GraphQL server...');
  startApiServer();
  console.log();

  // Start the event listener (ingest)
  console.log('[Ingest] Starting event listener...');
  const listener = new EventListener();

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Main] Shutting down...');
    listener.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await listener.start();
}

main().catch((err) => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
