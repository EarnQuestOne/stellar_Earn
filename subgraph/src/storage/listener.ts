// =============================================================================
// Stellar Event Listener — polls Soroban RPC for contract events
// =============================================================================
// Uses the Soroban RPC getEvents endpoint to continuously fetch new events
// from the EarnQuest contract, starting from the last indexed ledger.
// =============================================================================

import { Server, SorobanRpc } from '@stellar/stellar-sdk';
import { config } from '../config';
import { TOPIC_TO_NAME, EVENT_TOPICS, EventTopicName } from '../config/topics';
import { getCursor, setCursor, saveEvent } from '../storage/database';
import { handleEvent } from '../mappings';

const logger = {
  info: (...args: any[]) => console.log('[Ingest]', ...args),
  error: (...args: any[]) => console.error('[Ingest]', ...args),
  warn: (...args: any[]) => console.warn('[Ingest]', ...args),
};

export class EventListener {
  private server: Server;
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.server = new Server(config.rpcUrl);
  }

  /** Start the polling loop */
  async start(): Promise<void> {
    this.running = true;
    logger.info('Event listener started');
    logger.info(`Contract: ${config.contractId}`);
    logger.info(`RPC: ${config.rpcUrl}`);

    let startLedger = config.startLedger || getCursor();
    if (startLedger === 0) {
      // Auto-detect: start from the current ledger
      const latestLedger = await this.getLatestLedger();
      startLedger = latestLedger;
      logger.info(`Auto-detected start ledger: ${startLedger}`);
    }

    this.poll(startLedger);
  }

  /** Stop the polling loop */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    logger.info('Event listener stopped');
  }

  /** Get the latest ledger from the network */
  private async getLatestLedger(): Promise<number> {
    try {
      const info = await this.server.getLatestLedger();
      return info.sequence;
    } catch (err) {
      logger.error('Failed to get latest ledger:', err);
      throw err;
    }
  }

  /** Main polling loop */
  private async poll(fromLedger: number): Promise<void> {
    if (!this.running) return;

    try {
      const latestLedger = await this.getLatestLedger();

      if (fromLedger >= latestLedger) {
        // Nothing new, wait and retry
        this.scheduleNextPoll(fromLedger);
        return;
      }

      // Fetch events in batches
      let cursor = fromLedger;
      while (cursor < latestLedger && this.running) {
        const endLedger = Math.min(cursor + config.ledgersPerPage, latestLedger);
        const events = await this.fetchEvents(cursor + 1, endLedger);

        if (events.length > 0) {
          logger.info(`Fetched ${events.length} events from ledgers ${cursor + 1}–${endLedger}`);
          for (const event of events) {
            try {
              await handleEvent(event);
            } catch (err) {
              logger.error(`Failed to handle event ${event.id}:`, err);
            }
          }
        }

        cursor = endLedger;
        setCursor(cursor);
      }

      this.scheduleNextPoll(cursor);
    } catch (err) {
      logger.error('Poll error:', err);
      this.scheduleNextPoll(fromLedger);
    }
  }

  /** Fetch events from Soroban RPC for a ledger range */
  private async fetchEvents(
    startLedger: number,
    endLedger: number,
  ): Promise<SorobanRpc.GetEventsResponse['events']> {
    try {
      // Build topic filters for all known event types
      const topicFilters = Object.values(EVENT_TOPICS).map((topic) => [topic]);

      const response = await this.server.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [config.contractId],
            topics: topicFilters,
          },
        ],
        limit: 200,
      });

      return response.events || [];
    } catch (err) {
      logger.error(`Failed to fetch events for ledgers ${startLedger}–${endLedger}:`, err);
      return [];
    }
  }

  /** Schedule the next poll after the configured interval */
  private scheduleNextPoll(ledger: number): void {
    this.timer = setTimeout(() => {
      this.poll(ledger);
    }, config.pollIntervalMs);
  }
}
