/**
 * Job Payload Validation Schemas
 *
 * Each class mirrors a typed payload interface from job.types.ts and
 * decorates its properties with class-validator constraints.
 *
 * Usage: instantiate via plainToInstance(), then call validate().
 */

import {
  IsString,
  IsNumber,
  IsPositive,
  IsEmail,
  IsIn,
  IsOptional,
  IsArray,
  IsObject,
  IsUrl,
  IsNotEmpty,
  MinLength,
  ArrayNotEmpty,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export class PayoutProcessSchema {
  @IsString()
  @IsNotEmpty()
  payoutId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(56)
  recipientAddress: string;
}

export class PayoutSettleSchema {
  @IsString()
  @IsNotEmpty()
  payoutId: string;

  @IsString()
  @IsOptional()
  transactionHash?: string;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export class EmailSendSchema {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}

export class EmailDigestSchema {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsIn(['daily', 'weekly', 'monthly'])
  digestType: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  recipientEmails: string[];
}

// ---------------------------------------------------------------------------
// Data Export
// ---------------------------------------------------------------------------

export class DataExportSchema {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsIn(['users', 'payouts', 'quests', 'analytics'])
  exportType: string;

  @IsIn(['csv', 'json', 'xlsx'])
  format: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  exportId?: string;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export class ReportGenerateSchema {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsIn(['financial', 'activity', 'compliance'])
  reportType: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export class CleanupExpiredSessionsSchema {
  @IsInt()
  @Min(1)
  olderThanDays: number;
}

export class CleanupOldLogsSchema {
  @IsInt()
  @Min(1)
  olderThanDays: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  logTypes?: string[];
}

// ---------------------------------------------------------------------------
// Database Maintenance
// ---------------------------------------------------------------------------

export class DatabaseMaintenanceSchema {
  @IsIn(['vacuum', 'analyze', 'reindex'])
  maintenanceType: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetTables?: string[];
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export class WebhookDeliverSchema {
  @IsString()
  @IsNotEmpty()
  webhookId: string;

  @IsString()
  @IsNotEmpty()
  event: string;

  // payload can be any serialisable value
  @IsNotEmpty()
  payload: unknown;

  @IsUrl({ require_protocol: true, require_tld: false })
  url: string;

  @IsString()
  @IsOptional()
  secret?: string;
}

export class WebhookRetrySchema {
  @IsString()
  @IsNotEmpty()
  webhookLogId: string;

  @IsInt()
  @Min(1)
  attemptNumber: number;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export class AnalyticsAggregateSchema {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsIn(['hourly', 'daily', 'weekly', 'monthly'])
  aggregationType: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  metricsType: string[];
}

export class MetricsCollectSchema {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  metricsToCollect: string[];

  @IsIn(['last_hour', 'last_day', 'last_week'])
  @IsOptional()
  timeWindow?: string;
}

// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------

export class QuestDeadlineCheckSchema {
  @IsString()
  @IsNotEmpty()
  questId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;
}

export class QuestCompletionVerifySchema {
  @IsString()
  @IsNotEmpty()
  questId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  submissionId: string;
}

export class QuestStateReconcileSchema {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  questId?: string;
}

// ---------------------------------------------------------------------------
// Dependency
// ---------------------------------------------------------------------------

export class DependencyFreshnessCheckSchema {
  @IsString()
  @IsNotEmpty()
  repositoryOwner: string;

  @IsString()
  @IsNotEmpty()
  repositoryName: string;

  @IsString()
  @IsOptional()
  branch?: string;
}
