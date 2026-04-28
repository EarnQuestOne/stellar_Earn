# Indexer Integration Guide

## Overview
This guide provides practical examples for integrating an indexer with the EarnQuest contract's event system.

## Event Subscription Setup

### Basic Event Listener (Pseudo-code)

```typescript
import { SorobanRpc } from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
const contractId = 'YOUR_CONTRACT_ID';

// Subscribe to contract events
async function subscribeToEvents() {
  const events = await server.getEvents({
    startLedger: lastProcessedLedger,
    filters: [
      {
        type: 'contract',
        contractIds: [contractId],
      }
    ]
  });
  
  for (const event of events.events) {
    await processEvent(event);
  }
}
```

## Event Processing Examples

### 1. Quest Lifecycle Tracking

```typescript
interface QuestState {
  id: string;
  creator: string;
  status: 'Active' | 'Paused' | 'Completed' | 'Expired' | 'Cancelled';
  rewardAmount: bigint;
  maxParticipants: number;
  totalClaims: number;
  createdAt: number;
  updatedAt: number;
}

async function processQuestEvent(event: Event) {
  const topic = event.topic[0];
  
  switch (topic) {
    case 'quest_reg':
      const quest = parseQuestData(event.data);
      await db.quests.insert({
        id: quest.id,
        creator: quest.creator,
        status: 'Active',
        rewardAmount: quest.reward_amount,
        maxParticipants: quest.max_participants,
        totalClaims: 0,
        createdAt: event.ledger.timestamp,
        updatedAt: event.ledger.timestamp,
      });
      break;
      
    case 'status_upd':
      const updatedQuest = parseQuestData(event.data);
      await db.quests.update(updatedQuest.id, {
        status: updatedQuest.status,
        updatedAt: event.ledger.timestamp,
      });
      break;
      
    case 'quest_full':
      const questId = event.topic[1];
      await db.quests.update(questId, {
        status: 'Completed',
        updatedAt: event.ledger.timestamp,
      });
      break;
      
    case 'quest_can':
      const cancelledQuestId = event.topic[1];
      await db.quests.update(cancelledQuestId, {
        status: 'Cancelled',
        updatedAt: event.ledger.timestamp,
      });
      break;
  }
}
```

### 2. Submission Tracking

```typescript
interface Submission {
  questId: string;
  submitter: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  proofHash: string;
  submittedAt: number;
  updatedAt: number;
}

async function processSubmissionEvent(event: Event) {
  const topic = event.topic[0];
  const questId = event.topic[1];
  const submitter = event.data;
  
  switch (topic) {
    case 'proof_sub':
      await db.submissions.insert({
        questId,
        submitter,
        status: 'Pending',
        submittedAt: event.ledger.timestamp,
        updatedAt: event.ledger.timestamp,
      });
      
      // Update quest submission count
      await db.quests.increment(questId, 'submissionCount');
      break;
      
    case 'approved':
      await db.submissions.update({ questId, submitter }, {
        status: 'Approved',
        updatedAt: event.ledger.timestamp,
      });
      
      // Update quest claims
      await db.quests.increment(questId, 'totalClaims');
      break;
      
    case 'rejected':
      await db.submissions.update({ questId, submitter }, {
        status: 'Rejected',
        updatedAt: event.ledger.timestamp,
      });
      break;
      
    case 'sub_paid':
      await db.submissions.update({ questId, submitter }, {
        status: 'Paid',
        updatedAt: event.ledger.timestamp,
      });
      break;
  }
}
```

### 3. User Reputation Tracking

```typescript
interface UserStats {
  address: string;
  totalXp: number;
  level: number;
  questsCompleted: number;
  badges: string[];
  lastUpdated: number;
}

async function processReputationEvent(event: Event) {
  const topic = event.topic[0];
  const userAddress = event.topic[1];
  
  switch (topic) {
    case 'xp_award':
      const xpAmount = event.data;
      const user = await db.users.findOrCreate(userAddress);
      
      user.totalXp += xpAmount;
      user.level = calculateLevel(user.totalXp);
      user.questsCompleted += 1;
      user.lastUpdated = event.ledger.timestamp;
      
      await db.users.update(userAddress, user);
      
      // Check for level-up achievements
      await checkLevelUpAchievements(userAddress, user.level);
      break;
      
    case 'badge_grant':
      const badge = event.data;
      await db.users.addBadge(userAddress, badge);
      await db.users.update(userAddress, {
        lastUpdated: event.ledger.timestamp,
      });
      break;
  }
}

function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 100) + 1;
}
```

### 4. Escrow Balance Tracking

```typescript
interface EscrowBalance {
  questId: string;
  balance: bigint;
  totalDeposited: bigint;
  totalPaid: bigint;
  totalWithdrawn: bigint;
  lastUpdated: number;
}

async function processEscrowEvent(event: Event) {
  const topic = event.topic[0];
  const questId = event.topic[1];
  
  switch (topic) {
    case 'escrow_dep':
      const depositAmount = BigInt(event.data);
      const escrow = await db.escrow.findOrCreate(questId);
      
      escrow.balance += depositAmount;
      escrow.totalDeposited += depositAmount;
      escrow.lastUpdated = event.ledger.timestamp;
      
      await db.escrow.update(questId, escrow);
      break;
      
    case 'escrow_pay':
      const recipient = event.data;
      const quest = await db.quests.findById(questId);
      const payoutAmount = quest.rewardAmount;
      
      const escrowPay = await db.escrow.findById(questId);
      escrowPay.balance -= payoutAmount;
      escrowPay.totalPaid += payoutAmount;
      escrowPay.lastUpdated = event.ledger.timestamp;
      
      await db.escrow.update(questId, escrowPay);
      
      // Track payout transaction
      await db.transactions.insert({
        type: 'payout',
        questId,
        recipient,
        amount: payoutAmount,
        timestamp: event.ledger.timestamp,
      });
      break;
      
    case 'escrow_wd':
      const withdrawAmount = BigInt(event.data);
      const escrowWd = await db.escrow.findById(questId);
      
      escrowWd.balance -= withdrawAmount;
      escrowWd.totalWithdrawn += withdrawAmount;
      escrowWd.lastUpdated = event.ledger.timestamp;
      
      await db.escrow.update(questId, escrowWd);
      break;
  }
}
```

### 5. Admin & System Events

```typescript
interface SystemEvent {
  type: string;
  admin: string;
  data: any;
  timestamp: number;
  ledger: number;
}

async function processSystemEvent(event: Event) {
  const topic = event.topic[0];
  
  switch (topic) {
    case 'init':
      const admin = event.topic[1];
      const version = event.data;
      
      await db.system.insert({
        type: 'initialization',
        admin,
        data: { version },
        timestamp: event.ledger.timestamp,
        ledger: event.ledger.sequence,
      });
      break;
      
    case 'admin_upd':
      const oldAdmin = event.topic[1];
      const newAdmin = event.data;
      
      await db.system.insert({
        type: 'admin_change',
        admin: oldAdmin,
        data: { newAdmin },
        timestamp: event.ledger.timestamp,
        ledger: event.ledger.sequence,
      });
      
      // Update current admin
      await db.config.update('admin', newAdmin);
      break;
      
    case 'upgrade':
      const upgradeAdmin = event.topic[1];
      const wasmHash = event.data;
      
      await db.system.insert({
        type: 'contract_upgrade',
        admin: upgradeAdmin,
        data: { wasmHash },
        timestamp: event.ledger.timestamp,
        ledger: event.ledger.sequence,
      });
      break;
      
    case 'migrate':
      const migrateAdmin = event.topic[1];
      const [oldVersion, newVersion] = event.data;
      
      await db.system.insert({
        type: 'data_migration',
        admin: migrateAdmin,
        data: { oldVersion, newVersion },
        timestamp: event.ledger.timestamp,
        ledger: event.ledger.sequence,
      });
      break;
  }
}
```

### 6. Pause System Monitoring

```typescript
interface PauseState {
  isPaused: boolean;
  pauseTimestamp: number;
  timelockDelay: number;
  requiredSignatures: number;
  currentSignatures: number;
  gracePeriod: number;
  reason?: string;
}

async function processPauseEvent(event: Event) {
  const topic = event.topic[0];
  
  if (topic === 'pause' && event.topic[1] === 'state_changed') {
    const pauseEvent = event.data;
    
    await db.pauseState.update({
      isPaused: pauseEvent.is_paused,
      pauseTimestamp: pauseEvent.timestamp,
      reason: pauseEvent.reason,
      lastUpdated: event.ledger.timestamp,
    });
    
    // Send alerts if paused
    if (pauseEvent.is_paused) {
      await sendAlert({
        type: 'CONTRACT_PAUSED',
        reason: pauseEvent.reason,
        timestamp: pauseEvent.timestamp,
      });
    }
  }
  
  if (topic === 'pause' && event.topic[1] === 'contract_resumed') {
    await db.pauseState.update({
      isPaused: false,
      lastUpdated: event.ledger.timestamp,
    });
    
    await sendAlert({
      type: 'CONTRACT_RESUMED',
      timestamp: event.data.timestamp,
    });
  }
  
  if (topic === 'pause_init') {
    const timelockDelay = event.topic[1];
    const [requiredSignatures, gracePeriod] = event.data;
    
    await db.pauseState.update({
      timelockDelay,
      requiredSignatures,
      gracePeriod,
      lastUpdated: event.ledger.timestamp,
    });
  }
}
```

## Complete Event Router

```typescript
async function processEvent(event: Event) {
  const topic = event.topic[0];
  
  // Quest events
  if (['quest_reg', 'status_upd', 'quest_full', 'quest_exp', 'auto_exp', 'quest_can'].includes(topic)) {
    await processQuestEvent(event);
  }
  
  // Submission events
  else if (['proof_sub', 'approved', 'rejected', 'sub_paid'].includes(topic)) {
    await processSubmissionEvent(event);
  }
  
  // Reputation events
  else if (['xp_award', 'badge_grant'].includes(topic)) {
    await processReputationEvent(event);
  }
  
  // Escrow events
  else if (['escrow_dep', 'escrow_pay', 'escrow_wd'].includes(topic)) {
    await processEscrowEvent(event);
  }
  
  // System events
  else if (['init', 'admin_upd', 'upgrade', 'migrate', 'rollback'].includes(topic)) {
    await processSystemEvent(event);
  }
  
  // Pause events
  else if (topic === 'pause' || ['pause_init', 'pause_cfg', 'pause_cancel'].includes(topic)) {
    await processPauseEvent(event);
  }
  
  // Emergency events
  else if (topic === 'emergency') {
    await processEmergencyEvent(event);
  }
  
  // Update last processed ledger
  await db.config.update('lastProcessedLedger', event.ledger.sequence);
}
```

## Database Schema Examples

### PostgreSQL Schema

```sql
-- Quests table
CREATE TABLE quests (
  id VARCHAR(32) PRIMARY KEY,
  creator VARCHAR(56) NOT NULL,
  reward_asset VARCHAR(56) NOT NULL,
  reward_amount BIGINT NOT NULL,
  verifier VARCHAR(56) NOT NULL,
  deadline BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  max_participants INTEGER NOT NULL,
  total_claims INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Submissions table
CREATE TABLE submissions (
  quest_id VARCHAR(32) NOT NULL,
  submitter VARCHAR(56) NOT NULL,
  proof_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL,
  submitted_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (quest_id, submitter),
  FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- User stats table
CREATE TABLE user_stats (
  address VARCHAR(56) PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  quests_completed INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  last_updated BIGINT NOT NULL
);

-- Escrow balances table
CREATE TABLE escrow_balances (
  quest_id VARCHAR(32) PRIMARY KEY,
  balance BIGINT DEFAULT 0,
  total_deposited BIGINT DEFAULT 0,
  total_paid BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,
  last_updated BIGINT NOT NULL,
  FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- System events table
CREATE TABLE system_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  admin VARCHAR(56),
  data JSONB,
  timestamp BIGINT NOT NULL,
  ledger INTEGER NOT NULL
);

-- Pause state table
CREATE TABLE pause_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_paused BOOLEAN DEFAULT FALSE,
  pause_timestamp BIGINT,
  timelock_delay BIGINT,
  required_signatures INTEGER,
  current_signatures INTEGER DEFAULT 0,
  grace_period BIGINT,
  reason VARCHAR(32),
  last_updated BIGINT NOT NULL,
  CHECK (id = 1)
);

-- Indexes for performance
CREATE INDEX idx_quests_creator ON quests(creator);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_submissions_submitter ON submissions(submitter);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_ledger ON system_events(ledger);
```

## Error Handling

```typescript
async function processEventWithRetry(event: Event, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processEvent(event);
      return;
    } catch (error) {
      console.error(`Error processing event (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt === maxRetries) {
        // Log to dead letter queue
        await db.failedEvents.insert({
          event,
          error: error.message,
          attempts: maxRetries,
          timestamp: Date.now(),
        });
        
        // Send alert
        await sendAlert({
          type: 'EVENT_PROCESSING_FAILED',
          event,
          error: error.message,
        });
      } else {
        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
}
```

## Monitoring & Alerts

```typescript
// Health check
async function checkIndexerHealth() {
  const lastProcessedLedger = await db.config.get('lastProcessedLedger');
  const currentLedger = await server.getLatestLedger();
  const lag = currentLedger.sequence - lastProcessedLedger;
  
  if (lag > 100) {
    await sendAlert({
      type: 'INDEXER_LAG',
      lag,
      message: `Indexer is ${lag} ledgers behind`,
    });
  }
}

// Run health check every minute
setInterval(checkIndexerHealth, 60000);
```

## Best Practices

1. **Idempotency**: Ensure event processing is idempotent
2. **Ordering**: Process events in ledger order
3. **Checkpointing**: Save last processed ledger frequently
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Monitoring**: Track indexer lag and failed events
6. **Validation**: Validate event data before processing
7. **Performance**: Use batch inserts for multiple events
8. **Alerting**: Set up alerts for critical events (pause, upgrade, etc.)

## Testing

```typescript
// Mock event for testing
const mockQuestEvent = {
  type: 'contract',
  ledger: {
    sequence: 12345,
    timestamp: 1234567890,
  },
  topic: ['quest_reg', 'quest_001'],
  data: {
    id: 'quest_001',
    creator: 'GABC...',
    reward_asset: 'GXYZ...',
    reward_amount: 1000n,
    verifier: 'GDEF...',
    deadline: 1234567890 + 86400,
    status: 'Active',
    max_participants: 10,
    total_claims: 0,
  },
};

await processEvent(mockQuestEvent);
```

## Resources

- Soroban RPC Documentation: https://developers.stellar.org/docs/data/rpc
- Event Streaming: https://developers.stellar.org/docs/data/rpc/api-reference/methods/getEvents
- Contract Events: https://developers.stellar.org/docs/smart-contracts/guides/events
