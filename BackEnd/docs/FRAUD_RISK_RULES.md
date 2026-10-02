# Fraud/Risk Rules Engine

## Overview

The Fraud/Risk Rules Engine provides a placeholder implementation for detecting payout anomalies and potential fraud patterns. This system analyzes payout transactions and assigns risk levels based on configurable rules.

## Architecture

### Components

1. **FraudRiskRulesService** (`src/modules/payouts/services/fraud-risk-rules.service.ts`)
   - Analyzes individual payouts for risk factors
   - Performs batch analysis of recent payouts
   - Provides risk statistics and blocking decisions
   - Returns risk assessments with detailed factors

2. **Controller Endpoints** (`src/modules/payouts/payouts.controller.ts`)
   - `GET /payouts/fraud-risk/:id` - Analyze single payout (Admin only)
   - `GET /payouts/fraud-risk/batch` - Batch analyze recent payouts (Admin only)
   - `GET /payouts/fraud-risk/statistics` - Get risk statistics (Admin only)

## Risk Levels

The system assigns one of four risk levels to each payout:

- **low**: Normal payout, no concerning patterns
- **medium**: Some risk factors detected, requires monitoring
- **high**: Significant risk factors, may require manual review
- **critical**: Severe risk, should be blocked automatically

## Current Risk Factors

### 1. High Amount Detection

- **Threshold**: Amount > 10,000
- **Risk Level**: High
- **Description**: Unusually large payout amounts

### 2. Frequency Analysis

- **Threshold**: >5 payouts to same address in 24 hours
- **Risk Level**: Medium
- **Description**: Multiple payouts to same address in short time

### 3. Retry Analysis

- **Threshold**: >2 failed attempts
- **Risk Level**: Medium
- **Description**: Multiple failed payout attempts

### 4. Address History

- **Threshold**: No previous payouts to address
- **Risk Level**: Low
- **Description**: Payout to new address with no history

### 5. Asset Type Check

- **Threshold**: Non-standard asset (not XLM or USDC)
- **Risk Level**: Medium
- **Description**: Payout in non-standard asset

## API Usage

### Analyze Single Payout

```typescript
GET /payouts/fraud-risk/:id
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "payoutId": "uuid",
  "riskLevel": "low|medium|high|critical",
  "riskFactors": ["Factor 1", "Factor 2"],
  "flagged": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Batch Analysis

```typescript
GET /payouts/fraud-risk/batch?hours=24
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "totalPayoutsChecked": 100,
  "flaggedPayouts": 5,
  "assessments": [
    {
      "payoutId": "uuid",
      "riskLevel": "medium",
      "riskFactors": ["Multiple payouts to same address"],
      "flagged": true,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Risk Statistics

```typescript
GET /payouts/fraud-risk/statistics
Authorization: Bearer <admin-token>
```

Response:

```json
{
  "totalPayouts": 1000,
  "highRiskPayouts": 50,
  "criticalRiskPayouts": 10,
  "averagePayoutAmount": 500.5,
  "uniqueAddresses": 800
}
```

## Blocking Logic

Payouts with `critical` risk level are automatically blocked:

```typescript
const shouldBlock = await fraudRiskRulesService.shouldBlockPayout(payoutId);
if (shouldBlock) {
  // Block the payout
}
```

## Integration with Payout Service

The `FraudRiskRulesService` is integrated into `PayoutsService` and can be used to:

- Pre-validate payouts before processing
- Flag suspicious transactions for manual review
- Generate risk reports for compliance
- Monitor payout patterns over time

## Future Enhancements

- [ ] Machine learning-based anomaly detection
- [ ] Real-time fraud alerts via webhooks
- [ ] Configurable risk thresholds per organization
- [ ] Historical pattern analysis
- [ ] Geographic location analysis
- [ ] Velocity checks (amount/time windows)
- [ ] Integration with external fraud detection services
- [ ] Whitelist/blacklist management
- [ ] Automated investigation workflows

## Testing

### Unit Tests

```bash
npm test -- fraud-risk-rules.service.spec.ts
```

### Integration Tests

```bash
npm test -- payouts.e2e-spec.ts
```

## Security Considerations

- All endpoints require admin authentication
- Risk assessments are logged for audit trails
- Sensitive payout data is protected
- Rate limiting applies to prevent abuse
- Consider implementing IP-based access controls

## Performance Considerations

- Batch analysis processes payouts in parallel
- Database queries use indexes for performance
- Consider caching risk assessments for repeated checks
- Implement pagination for large batch operations
