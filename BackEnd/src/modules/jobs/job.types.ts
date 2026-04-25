/**
 * Job Type Definitions & Enums
 * Comprehensive type system for all job queue operations
 */

export enum JobType {
  // Payout Processing
  PAYOUT_PROCESS = 'payout:process',
  PAYOUT_SETTLE = 'payout:settle',

  // Email Operations
  EMAIL_SEND = 'email:send',
  EMAIL_DIGEST = 'email:digest',

  // Data Export
  DATA_EXPORT = 'data:export',
  REPORT_GENERATE = 'report:generate',

  // Maintenance & Cleanup
  CLEANUP_EXPIRED_SESSIONS = 'cleanup:expired-sessions',
  CLEANUP_OLD_LOGS = 'cleanup:old-logs',
  DATABASE_MAINTENANCE = 'maintenance:database',

  // Webhook Delivery
  WEBHOOK_DELIVER = 'webhook:deliver',
  WEBHOOK_RETRY = 'webhook:retry',

  // Analytics & Metrics
  ANALYTICS_AGGREGATE = 'analytics:aggregate',
  METRICS_COLLECT = 'metrics:collect',

  // Quest Monitoring
  QUEST_DEADLINE_CHECK = 'quest:deadline-check',
  QUEST_COMPLETION_VERIFY = 'quest:completion-verify',
}

export enum JobPriority {
  LOW = 10,
  MEDIUM = 5,
  HIGH = 1,
  CRITICAL = 0,
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred',
  RETRY = 'retry',
}

export interface JobPayload {
  [key: string]: any;
}

export interface JobMetadata {
  userId?: string;
  organizationId?: string;
  correlationId?: string;
  traceId?: string;
  tags?: string[];
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
}

export interface JobRetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface JobDependency {
  jobId: string;
  status: JobStatus;
}

// Job Type Specific Payloads

export interface PayoutProcessPayload extends JobPayload {
  payoutId: string;
  organizationId: string;
  amount: number;
  recipientAddress: string;
}

export interface PayoutSettlePayload extends JobPayload {
  payoutId: string;
  transactionHash?: string;
}

export interface EmailSendPayload extends JobPayload {
  messageId: string;
  recipientEmail: string;
  templateId: string;
  variables?: Record<string, any>;
}

export interface EmailDigestPayload extends JobPayload {
  organizationId: string;
  digestType: 'daily' | 'weekly' | 'monthly';
  recipientEmails: string[];
}

export interface DataExportPayload extends JobPayload {
  organizationId: string;
  exportType: 'users' | 'payouts' | 'quests' | 'analytics';
  format: 'csv' | 'json' | 'xlsx';
  userId: string; // Who requested the export
  exportId?: string; // optional DB record id to correlate
}

export interface ReportGeneratePayload extends JobPayload {
  organizationId: string;
  reportType: 'financial' | 'activity' | 'compliance';
  startDate: string;
  endDate: string;
}

export interface CleanupExpiredSessionsPayload extends JobPayload {
  olderThanDays: number;
}

export interface CleanupOldLogsPayload extends JobPayload {
  olderThanDays: number;
  logTypes?: string[];
}

export interface DatabaseMaintenancePayload extends JobPayload {
  maintenanceType: 'vacuum' | 'analyze' | 'reindex';
  targetTables?: string[];
}

export interface WebhookDeliverPayload extends JobPayload {
  webhookId: string;
  event: string;
  payload: any;
  url: string;
  secret?: string;
}

export interface WebhookRetryPayload extends JobPayload {
  webhookLogId: string;
  attemptNumber: number;
}

export interface AnalyticsAggregatePayload extends JobPayload {
  organizationId: string;
  aggregationType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  metricsType: string[];
}

export interface MetricsCollectPayload extends JobPayload {
  metricsToCollect: string[];
  timeWindow?: 'last_hour' | 'last_day' | 'last_week';
}

export interface QuestDeadlineCheckPayload extends JobPayload {
  questId: string;
  organizationId: string;
}

export interface QuestCompletionVerifyPayload extends JobPayload {
  questId: string;
  userId: string;
  submissionId: string;
}

export type AnyJobPayload =
  | PayoutProcessPayload
  | PayoutSettlePayload
  | EmailSendPayload
  | EmailDigestPayload
  | DataExportPayload
  | ReportGeneratePayload
  | CleanupExpiredSessionsPayload
  | CleanupOldLogsPayload
  | DatabaseMaintenancePayload
  | WebhookDeliverPayload
  | WebhookRetryPayload
  | AnalyticsAggregatePayload
  | MetricsCollectPayload
  | QuestDeadlineCheckPayload
  | QuestCompletionVerifyPayload;
