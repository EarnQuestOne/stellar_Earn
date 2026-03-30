/**
 * Example Indexer for EarnQuest Contract Events
 * 
 * This TypeScript example demonstrates how to efficiently query and index
 * events from the EarnQuest Soroban contract using indexed fields.
 * 
 * Usage:
 *   npm install @stellar/stellar-sdk
 *   ts-node indexer-example.ts
 */

import { SorobanRpc, Address, nativeToScVal } from '@stellar/stellar-sdk';

// Contract configuration
const CONTRACT_ID = 'YOUR_CONTRACT_ID_HERE';
const RPC_URL = 'https://soroban-test.stellar.org:443';

// Event topic constants
const EVENT_TOPICS = {
  QUEST_REGISTERED: 'quest_reg',
  PROOF_SUBMITTED: 'proof_sub',
  SUBMISSION_APPROVED: 'sub_appr',
  REWARD_CLAIMED: 'claimed',
  XP_AWARDED: 'xp_award',
  LEVEL_UP: 'level_up',
  BADGE_GRANTED: 'badge_grt',
  ESCROW_DEPOSITED: 'esc_dep',
  ESCROW_PAYOUT: 'esc_pay',
  ESCROW_REFUNDED: 'esc_ref',
  QUEST_CANCELLED: 'q_cancel',
  QUEST_PAUSED: 'q_pause',
  QUEST_RESUMED: 'q_resume',
} as const;

// Type definitions
interface QuestCreatedEvent {
  questId: string;
  creator: string;
  rewardAsset: string;
  rewardAmount: bigint;
  verifier: string;
  deadline: bigint;
  timestamp: number;
  ledger: number;
}

interface SubmissionReceivedEvent {
  questId: string;
  submitter: string;
  proofHash: Uint8Array;
  timestamp: number;
  ledger: number;
}

interface PayoutCompletedEvent {
  questId: string;
  recipient: string;
  rewardAsset: string;
  amount: bigint;
  timestamp: number;
  ledger: number;
}

class EarnQuestIndexer {
  private server: SorobanRpc.Server;
  private contractAddress: Address;

  constructor(contractId: string, rpcUrl: string) {
    this.server = new SorobanRpc.Server(rpcUrl);
    this.contractAddress = new Address(contractId);
  }

  /**
   * Get all quests created by a specific creator
   * Uses indexed creator field for efficient filtering
   */
  async getQuestsByCreator(creatorAddress: string): Promise<QuestCreatedEvent[]> {
    const creatorScVal = nativeToScVal(Address.fromString(creatorAddress));
    
    const events = await this.server.getEvents({
      startLedger: 0,
      filters: [
        {
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.QUEST_REGISTERED],
            null, // quest_id (any)
            [creatorScVal], // creator (indexed)
            null // reward_asset (any)
          ]
        }
      ]
    });

    return events.map(event => this.parseQuestCreatedEvent(event));
  }

  /**
   * Get all submissions for a specific quest
   * Uses indexed quest_id field
   */
  async getSubmissionsForQuest(questId: string): Promise<SubmissionReceivedEvent[]> {
    const questIdScVal = nativeToScVal(questId);
    
    const events = await this.server.getEvents({
      startLedger: 0,
      filters: [
        {
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.PROOF_SUBMITTED],
            [questIdScVal], // quest_id (indexed)
            null // submitter (any)
          ]
        }
      ]
    });

    return events.map(event => this.parseSubmissionReceivedEvent(event));
  }

  /**
   * Get all payouts for a specific user
   * Uses indexed recipient field
   */
  async getPayoutsForUser(userAddress: string): Promise<PayoutCompletedEvent[]> {
    const userScVal = nativeToScVal(Address.fromString(userAddress));
    
    const events = await this.server.getEvents({
      startLedger: 0,
      filters: [
        {
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.REWARD_CLAIMED],
            null, // quest_id (any)
            [userScVal], // recipient (indexed)
            null // reward_asset (any)
          ]
        }
      ]
    });

    return events.map(event => this.parsePayoutCompletedEvent(event));
  }

  /**
   * Get all quests with a specific reward token
   * Uses indexed reward_asset field
   */
  async getQuestsByToken(tokenAddress: string): Promise<QuestCreatedEvent[]> {
    const tokenScVal = nativeToScVal(Address.fromString(tokenAddress));
    
    const events = await this.server.getEvents({
      startLedger: 0,
      filters: [
        {
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.QUEST_REGISTERED],
            null, // quest_id (any)
            null, // creator (any)
            [tokenScVal] // reward_asset (indexed)
          ]
        }
      ]
    });

    return events.map(event => this.parseQuestCreatedEvent(event));
  }

  /**
   * Get complete activity history for a user
   * Combines multiple event types for comprehensive tracking
   */
  async getUserActivity(userAddress: string) {
    const userScVal = nativeToScVal(Address.fromString(userAddress));
    
    // Parallel queries for different event types
    const [submissions, payouts, xpAwards, levelUps, badges] = await Promise.all([
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.PROOF_SUBMITTED],
            null,
            [userScVal]
          ]
        }]
      }),
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.REWARD_CLAIMED],
            null,
            [userScVal],
            null
          ]
        }]
      }),
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.XP_AWARDED],
            [userScVal]
          ]
        }]
      }),
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.LEVEL_UP],
            [userScVal]
          ]
        }]
      }),
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.BADGE_GRANTED],
            [userScVal],
            null
          ]
        }]
      })
    ]);

    return {
      submissions: submissions.length,
      payouts: payouts.length,
      totalPayoutAmount: payouts.reduce((sum, e) => sum + BigInt(this.parseEventData(e).amount), 0n),
      xpAwards: xpAwards.length,
      levelUps: levelUps.length,
      badges: badges.length
    };
  }

  /**
   * Track escrow activity for a quest
   */
  async getQuestEscrowActivity(questId: string) {
    const questIdScVal = nativeToScVal(questId);
    
    const [deposits, payouts, refunds] = await Promise.all([
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.ESCROW_DEPOSITED],
            [questIdScVal],
            null
          ]
        }]
      }),
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.ESCROW_PAYOUT],
            [questIdScVal],
            null
          ]
        }]
      }),
      this.server.getEvents({
        startLedger: 0,
        filters: [{
          type: 'contract',
          contractIds: [this.contractAddress.toString()],
          topics: [
            [EVENT_TOPICS.ESCROW_REFUNDED],
            [questIdScVal],
            null
          ]
        }]
      })
    ]);

    return {
      deposits: deposits.length,
      payouts: payouts.length,
      refunds: refunds.length,
      totalDeposited: deposits.reduce((sum, e) => sum + BigInt(this.parseEventData(e).amount), 0n),
      totalPaidOut: payouts.reduce((sum, e) => sum + BigInt(this.parseEventData(e).amount), 0n),
      totalRefunded: refunds.reduce((sum, e) => sum + BigInt(this.parseEventData(e).amount), 0n)
    };
  }

  // Helper methods for parsing events
  private parseQuestCreatedEvent(event: any): QuestCreatedEvent {
    const data = this.parseEventData(event);
    return {
      questId: this.scValToString(event.topic[1]),
      creator: this.scValToString(event.topic[2]),
      rewardAsset: this.scValToString(event.topic[3]),
      rewardAmount: BigInt(data.reward_amount),
      verifier: this.scValToString(data.verifier),
      deadline: BigInt(data.deadline),
      timestamp: event.ledgerTimestamp,
      ledger: event.ledger
    };
  }

  private parseSubmissionReceivedEvent(event: any): SubmissionReceivedEvent {
    const data = this.parseEventData(event);
    return {
      questId: this.scValToString(event.topic[1]),
      submitter: this.scValToString(event.topic[2]),
      proofHash: new Uint8Array(Buffer.from(data.proof_hash, 'hex')),
      timestamp: event.ledgerTimestamp,
      ledger: event.ledger
    };
  }

  private parsePayoutCompletedEvent(event: any): PayoutCompletedEvent {
    const data = this.parseEventData(event);
    return {
      questId: this.scValToString(event.topic[1]),
      recipient: this.scValToString(event.topic[2]),
      rewardAsset: this.scValToString(event.topic[3]),
      amount: BigInt(data.amount),
      timestamp: event.ledgerTimestamp,
      ledger: event.ledger
    };
  }

  private parseEventData(event: any): any {
    // Convert ScVal to readable format
    // Implementation depends on Soroban SDK version
    return event.event.data;
  }

  private scValToString(scVal: any): string {
    // Convert ScVal to string representation
    // Implementation depends on Soroban SDK version
    return scVal.toString();
  }
}

// Usage Example
async function main() {
  const indexer = new EarnQuestIndexer(CONTRACT_ID, RPC_URL);

  console.log('=== EarnQuest Event Indexing Example ===\n');

  // Example 1: Get all quests by creator
  const creatorAddress = 'G...'; // Creator address
  const creatorQuests = await indexer.getQuestsByCreator(creatorAddress);
  console.log(`Found ${creatorQuests.length} quests created by ${creatorAddress}`);

  // Example 2: Get submissions for a quest
  const questId = 'Q1';
  const submissions = await indexer.getSubmissionsForQuest(questId);
  console.log(`Found ${submissions.length} submissions for quest ${questId}`);

  // Example 3: Get payouts for a user
  const userAddress = 'G...'; // User address
  const payouts = await indexer.getPayoutsForUser(userAddress);
  console.log(`Found ${payouts.length} payouts for user ${userAddress}`);
  console.log(`Total payout amount: ${payouts.reduce((sum, p) => sum + p.amount, 0n)}`);

  // Example 4: Get complete user activity
  const activity = await indexer.getUserActivity(userAddress);
  console.log('\nUser Activity Summary:');
  console.log(`- Submissions: ${activity.submissions}`);
  console.log(`- Payouts: ${activity.payouts}`);
  console.log(`- Total Payout Amount: ${activity.totalPayoutAmount}`);
  console.log(`- XP Awards: ${activity.xpAwards}`);
  console.log(`- Level Ups: ${activity.levelUps}`);
  console.log(`- Badges: ${activity.badges}`);

  // Example 5: Track escrow activity
  const escrowActivity = await indexer.getQuestEscrowActivity(questId);
  console.log(`\nEscrow Activity for ${questId}:`);
  console.log(`- Deposits: ${escrowActivity.deposits}`);
  console.log(`- Payouts: ${escrowActivity.payouts}`);
  console.log(`- Refunds: ${escrowActivity.refunds}`);
  console.log(`- Total Deposited: ${escrowActivity.totalDeposited}`);
  console.log(`- Total Paid Out: ${escrowActivity.totalPaidOut}`);
  console.log(`- Total Refunded: ${escrowActivity.totalRefunded}`);
}

// Run example
main().catch(console.error);

export default EarnQuestIndexer;
