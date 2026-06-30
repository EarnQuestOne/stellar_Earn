/**
 * Job Payload Validator Service
 *
 * Validates job payloads before they are enqueued.  Validation uses
 * class-validator so it stays consistent with NestJS DTO validation
 * elsewhere in the project.
 *
 * - Each queue name maps to one or more payload schema classes.
 * - `validate()` returns a list of human-readable error strings or an
 *   empty array when the payload is valid.
 * - `assertValid()` throws `InvalidJobPayloadException` on failure so
 *   callers don't have to check the return value themselves.
 */

import { Injectable, Logger } from '@nestjs/common';
import { validate, ValidatorOptions } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InvalidJobPayloadException } from '../../../common/exceptions/app.exceptions';
import { QUEUES } from '../jobs.constants';
import {
  PayoutProcessSchema,
  PayoutSettleSchema,
  EmailSendSchema,
  EmailDigestSchema,
  DataExportSchema,
  ReportGenerateSchema,
  CleanupExpiredSessionsSchema,
  CleanupOldLogsSchema,
  DatabaseMaintenanceSchema,
  WebhookDeliverSchema,
  WebhookRetrySchema,
  AnalyticsAggregateSchema,
  MetricsCollectSchema,
  QuestDeadlineCheckSchema,
  QuestCompletionVerifySchema,
  QuestStateReconcileSchema,
  DependencyFreshnessCheckSchema,
} from './job-payload.schemas';

/** Mapping from queue name → array of acceptable schema constructors.
 *  When a queue accepts multiple job shapes (e.g. payouts handles both
 *  PROCESS and SETTLE) all shapes are listed and the payload is considered
 *  valid if it passes at least one.
 */
const QUEUE_SCHEMAS: Record<string, { new (): object }[]> = {
  [QUEUES.PAYOUTS]: [PayoutProcessSchema, PayoutSettleSchema],
  [QUEUES.EMAIL]: [EmailSendSchema, EmailDigestSchema],
  [QUEUES.EXPORTS]: [DataExportSchema],
  [QUEUES.REPORTS]: [ReportGenerateSchema],
  [QUEUES.CLEANUP]: [CleanupExpiredSessionsSchema, CleanupOldLogsSchema],
  [QUEUES.MAINTENANCE]: [DatabaseMaintenanceSchema, DependencyFreshnessCheckSchema],
  [QUEUES.WEBHOOKS]: [WebhookDeliverSchema, WebhookRetrySchema],
  [QUEUES.ANALYTICS]: [AnalyticsAggregateSchema, MetricsCollectSchema],
  [QUEUES.QUESTS]: [
    QuestDeadlineCheckSchema,
    QuestCompletionVerifySchema,
    QuestStateReconcileSchema,
  ],
  // The queues below accept generic/internal payloads – they receive either
  // lightweight trigger objects or data already validated upstream, so we
  // intentionally do not enforce a strict schema here.
  [QUEUES.NOTIFICATIONS]: [],
  [QUEUES.SCHEDULED]: [],
  [QUEUES.DEAD_LETTER]: [],
};

const VALIDATOR_OPTIONS: ValidatorOptions = {
  whitelist: false,       // allow extra __trace / tracing fields
  forbidNonWhitelisted: false,
  skipMissingProperties: false,
};

@Injectable()
export class JobPayloadValidatorService {
  private readonly logger = new Logger(JobPayloadValidatorService.name);

  /**
   * Validate `data` against the schema(s) registered for `queueName`.
   *
   * - If the queue has no registered schemas ([], e.g. NOTIFICATIONS) the
   *   payload is accepted without constraint.
   * - If the queue has one schema the payload must match it.
   * - If the queue has multiple schemas the payload must satisfy at least
   *   one (union types like payouts: process | settle).
   *
   * Returns an empty array when valid, or a non-empty array of error
   * messages when invalid.
   */
  async validate(queueName: string, data: unknown): Promise<string[]> {
    const schemas = QUEUE_SCHEMAS[queueName];

    // Unknown queue – let the caller handle it (the service already throws
    // "Queue not found" before we reach this point).
    if (schemas === undefined) {
      this.logger.warn(
        `No schema registry entry for queue '${queueName}' – skipping payload validation`,
      );
      return [];
    }

    // Queue with no required schema – pass through.
    if (schemas.length === 0) {
      return [];
    }

    // Strip internal tracing key before validation so it does not confuse
    // validators that use strict mode.
    const sanitised = this.stripInternalKeys(data);

    if (schemas.length === 1) {
      return this.validateAgainstSchema(schemas[0], sanitised);
    }

    // Multi-schema queue: valid if at least ONE schema passes.
    for (const SchemaClass of schemas) {
      const errors = await this.validateAgainstSchema(SchemaClass, sanitised);
      if (errors.length === 0) {
        return [];
      }
    }

    // All schemas failed – collect errors from each to give a useful message.
    const allErrors: string[] = [];
    for (const SchemaClass of schemas) {
      const errors = await this.validateAgainstSchema(SchemaClass, sanitised);
      if (errors.length > 0) {
        allErrors.push(`[${SchemaClass.name}]: ${errors.join(', ')}`);
      }
    }
    return allErrors;
  }

  /**
   * Convenience method that throws `InvalidJobPayloadException` when the
   * payload is invalid.  This is the method called by `addJob()`.
   */
  async assertValid(queueName: string, data: unknown): Promise<void> {
    const errors = await this.validate(queueName, data);
    if (errors.length > 0) {
      this.logger.warn(
        `Rejecting invalid payload for queue '${queueName}': ${errors.join(' | ')}`,
      );
      throw new InvalidJobPayloadException(queueName, errors);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async validateAgainstSchema(
    SchemaClass: { new (): object },
    data: unknown,
  ): Promise<string[]> {
    const instance = plainToInstance(SchemaClass, data);
    const violations = await validate(instance as object, VALIDATOR_OPTIONS);

    if (violations.length === 0) return [];

    return violations.flatMap((v) =>
      v.constraints ? Object.values(v.constraints) : [],
    );
  }

  /**
   * Remove internal framework keys (prefixed with `__`) before validation
   * so tracing metadata injected by `attachTraceContext()` does not
   * interfere with schema checks.
   */
  private stripInternalKeys(data: unknown): unknown {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(
        ([key]) => !key.startsWith('__'),
      ),
    );
  }
}
