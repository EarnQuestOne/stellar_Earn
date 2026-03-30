# Event Specification & Indexing Guide

## Overview

This document defines the complete event specification for the EarnQuest Soroban smart contract. All events are designed with **indexed fields** to enable efficient off-chain querying, subgraph integration, and indexer compatibility.

## Event Architecture

### Schema Design

Each event follows a standardized schema optimized for indexing:

```
Topics: [EventName, IndexedField1, IndexedField2, ...]
Data: { NonIndexedFields... }
```

**Topics** (Indexed):
- Enable efficient filtering and querying
- Appear in blockchain logs
- Can be searched by off-chain indexers
- Limited to types supported by Soroban (Address, Symbol, etc.)

**Data** (Non-Indexed):
- Contains detailed information
- Used for display after filtering
- Cannot be directly queried
- Supports complex data structures

---

## Core Events

### 1. QuestCreated (`quest_reg`)

Emitted when a new quest is created.

**Topics (Indexed):**
- `quest_id` (Symbol) - Unique quest identifier
- `creator` (Address) - Quest creator's address
- `reward_asset` (Address) - Token contract address for rewards

**Data:**
- `reward_amount` (i128) - Reward amount per completion
- `verifier` (Address) - Authorized verifier address
- `deadline` (u64) - Quest expiration timestamp

**Use Cases:**
- Filter quests by creator
- Track specific token reward quests
- Monitor quest creation activity

**Example Query:**
```typescript
// Get all quests by creator
contract.events.getEvents({
  topic: ["quest_reg", null, creatorAddress, null]
})
```

---

### 2. SubmissionReceived (`proof_sub`)

Emitted when a user submits proof for a quest.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `submitter` (Address) - User who submitted

**Data:**
- `proof_hash` (BytesN<32>) - Hash of submitted proof

**Use Cases:**
- Track submissions per quest
- Monitor user submission history
- Verify submission timestamps

**Example Query:**
```typescript
// Get all submissions for a quest
contract.events.getEvents({
  topic: ["proof_sub", questId, null]
})
```

---

### 3. SubmissionApproved (`sub_appr`)

Emitted when a verifier approves a submission.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `submitter` (Address) - User whose submission was approved

**Data:**
- `verifier` (Address) - Verifier who approved

**Use Cases:**
- Track approved submissions
- Monitor verifier activity
- Calculate completion rates

---

### 4. PayoutCompleted (`claimed`)

Emitted when a user claims their reward.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `recipient` (Address) - Reward recipient
- `reward_asset` (Address) - Token contract address

**Data:**
- `amount` (i128) - Amount claimed

**Use Cases:**
- Track payouts by quest
- Monitor user earnings
- Audit token distributions

**Example Query:**
```typescript
// Get all payouts for a specific token
contract.events.getEvents({
  topic: ["claimed", null, null, tokenAddress]
})
```

---

### 5. ReputationChanged (`xp_award`, `level_up`, `badge_grt`)

#### 5.1 XP Awarded (`xp_award`)

**Topics (Indexed):**
- `user` (Address) - User receiving XP

**Data:**
- `xp_amount` (u64) - XP awarded
- `total_xp` (u64) - User's total XP
- `level` (u32) - Current level

#### 5.2 Level Up (`level_up`)

**Topics (Indexed):**
- `user` (Address) - User who leveled up

**Data:**
- `new_level` (u32) - New level reached

#### 5.3 Badge Granted (`badge_grt`)

**Topics (Indexed):**
- `user` (Address) - User receiving badge
- `badge_type` (Badge enum) - Type of badge

**Data:**
- *(empty - badge type already in topics)*

**Use Cases:**
- Track user progression
- Monitor reputation distribution
- Identify top contributors

---

## Escrow Events

### 6. EscrowDeposited (`esc_dep`)

Emitted when tokens are deposited into escrow.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `depositor` (Address) - Who deposited

**Data:**
- `amount` (i128) - Amount deposited
- `total_balance` (i128) - Total escrow balance

**Use Cases:**
- Track escrow funding
- Monitor depositor activity
- Verify sufficient collateral

---

### 7. EscrowPayout (`esc_pay`)

Emitted when tokens are paid from escrow.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `recipient` (Address) - Payment recipient

**Data:**
- `amount` (i128) - Amount paid
- `remaining` (i128) - Remaining escrow balance

**Use Cases:**
- Track payout distribution
- Monitor escrow depletion
- Audit fund flows

---

### 8. EscrowRefunded (`esc_ref`)

Emitted when remaining escrow is refunded to creator.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `recipient` (Address) - Refund recipient (creator)

**Data:**
- `amount` (i128) - Refund amount

**Use Cases:**
- Track quest cancellations
- Monitor refund activity
- Verify fund returns

---

## Administrative Events

### 9. QuestPaused (`q_pause`)

Emitted when a quest is paused by admin.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `by` (Address) - Admin who paused

**Data:**
- `by` (Address) - Admin address (duplicate for clarity)

---

### 10. QuestResumed (`q_resume`)

Emitted when a quest is resumed by admin.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `by` (Address) - Admin who resumed

**Data:**
- `by` (Address) - Admin address

---

### 11. QuestCancelled (`q_cancel`)

Emitted when a quest is cancelled.

**Topics (Indexed):**
- `quest_id` (Symbol) - Quest identifier
- `creator` (Address) - Quest creator

**Data:**
- `refunded` (i128) - Amount refunded to creator

---

## Emergency Events

### 12. EmergencyPaused (`epause`)

Emitted when contract is emergency paused.

**Topics (Indexed):**
- `by` (Address) - Admin who paused

**Data:**
- `by` (Address) - Admin address

---

### 13. EmergencyUnpaused (`eunpause`)

Emitted when contract is emergency unpaused.

**Topics (Indexed):**
- `by` (Address) - Admin who unpaused

**Data:**
- `by` (Address) - Admin address

---

### 14. EmergencyWithdraw (`ewdraw`)

Emitted during emergency withdrawal.

**Topics (Indexed):**
- `by` (Address) - Admin who withdrew
- `asset` (Address) - Token being withdrawn
- `to` (Address) - Recipient address

**Data:**
- `amount` (i128) - Withdrawal amount

**Use Cases:**
- Track emergency actions
- Monitor fund safety mechanisms
- Audit admin activities

---

### 15. UnpauseApproved (`uappr`)

Emitted when admin approves unpause.

**Topics (Indexed):**
- `admin` (Address) - Approving admin

**Data:**
- `admin` (Address) - Admin address

---

### 16. TimelockScheduled (`tl_sched`)

Emitted when timelock is scheduled for unpause.

**Topics (Indexed):**
- `scheduled_time` (u64) - When unpause will occur

**Data:**
- `scheduled_time` (u64) - Timestamp

---

## Event Indexing Strategy

### Primary Index Keys

For efficient querying, events are indexed by these primary keys:

1. **Quest ID** - Most common filter
   - All quest-specific events include `quest_id` in topics
   
2. **User Address** - User-centric queries
   - Submissions, payouts, reputation changes all index user addresses
   
3. **Token Address** - Asset tracking
   - Reward-related events index `reward_asset`
   
4. **Creator Address** - Creator analytics
   - Quest creation events index `creator`

### Query Patterns

#### Pattern 1: Get All Events for a Quest
```typescript
const questEvents = await contract.events.getEvents({
  topic: [null, questId, null, null] // Match any event with this quest_id
});
```

#### Pattern 2: Get User's Activity
```typescript
const userActivity = await Promise.all([
  contract.events.getEvents({
    topic: ["proof_sub", null, userAddress]
  }),
  contract.events.getEvents({
    topic: ["claimed", null, userAddress, null]
  }),
  contract.events.getEvents({
    topic: ["xp_award", userAddress]
  })
]);
```

#### Pattern 3: Track Specific Token Quests
```typescript
const tokenQuests = await contract.events.getEvents({
  topic: ["quest_reg", null, null, tokenAddress]
});
```

---

## Subgraph Integration

### Mapping Example

```typescript
export function handleQuestCreated(event: QuestCreated): void {
  const quest = new Quest(event.params.quest_id);
  quest.creator = event.params.creator;
  quest.rewardAsset = event.params.reward_asset;
  quest.rewardAmount = event.params.reward_amount;
  quest.verifier = event.params.verifier;
  quest.deadline = event.params.deadline;
  quest.createdAt = event.block.timestamp;
  quest.save();
}
```

### Schema Definition

```graphql
type Quest @entity {
  id: ID!
  creator: Bytes!
  rewardAsset: Bytes!
  rewardAmount: BigInt!
  verifier: Bytes!
  deadline: BigInt!
  createdAt: BigInt!
  submissions: [Submission!]! @derivedFrom(field: "quest")
}

type Submission @entity {
  id: ID!
  quest: Quest!
  submitter: Bytes!
  proofHash: Bytes!
  status: String!
  timestamp: BigInt!
}
```

---

## Best Practices

### For Indexers

1. **Index Topics First**: Filter by topics before processing data
2. **Batch Processing**: Process events in batches for efficiency
3. **Handle Reorgs**: Implement reorganization handling
4. **Cache Frequently Queried Addresses**: Creator, user, token addresses

### For Frontend Developers

1. **Use Indexed Fields**: Always filter by indexed topics when possible
2. **Pagination**: Implement pagination for large result sets
3. **Error Handling**: Handle missing events gracefully
4. **Caching**: Cache event data client-side when appropriate

### For Smart Contract Developers

1. **Consistent Schemas**: Maintain consistent event structures
2. **Document Changes**: Update this spec when adding/modifying events
3. **Test Events**: Include event validation in tests
4. **Gas Optimization**: Balance indexing with gas costs

---

## Testing Event Emission

### Unit Test Example

```rust
#[test]
fn test_quest_created_event() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);
    
    let creator = Address::generate(&env);
    let token = register_token(&env);
    let verifier = Address::generate(&env);
    let quest_id = symbol_short!("q1");
    
    client.register_quest(&quest_id, &creator, &token, &100i128, &verifier, &1000u64);
    
    // Verify event was emitted with correct topics
    let events = env.events().all();
    assert_eq!(events.len(), 1);
    
    let (topics, _) = events.get(0).unwrap();
    assert_eq!(topics.get(0).unwrap(), Symbol::try_from_val(&env, &"quest_reg").unwrap());
    assert_eq!(topics.get(1).unwrap(), Val::from(quest_id));
    assert_eq!(topics.get(2).unwrap(), Val::from(creator.clone()));
    assert_eq!(topics.get(3).unwrap(), Val::from(token.clone()));
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-27 | Initial specification with indexed events |
| 1.1 | TBD | Added batch operation events |

---

## Support

For questions or issues regarding event specification:
- Review existing tests in `tests/test_events.rs`
- Check example indexer in `examples/indexer-example.ts`
- Consult Soroban event documentation
