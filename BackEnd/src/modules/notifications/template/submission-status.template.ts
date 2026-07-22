import {
  submissionApprovedEmailTemplate,
  submissionRejectedEmailTemplate,
  type NotificationTemplateRenderResult,
  type NotificationTemplateRenderFn,
  type SubmissionApprovedTemplateData,
  type SubmissionRejectedTemplateData,
  type SubmissionStatusTemplateData,
} from './notification.interface';
import type { EmailTemplateEngine } from '#src/modules/email/templates/template.engine';

const assertNonEmptyString = (value: unknown, field: string): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${field}`);
  }
};

const assertNumberOptional = (value: unknown, field: string): void => {
  if (value === undefined) return;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid field: ${field}`);
  }
};

export const renderSubmissionStatusTemplate: NotificationTemplateRenderFn<
  SubmissionStatusTemplateData
> = (
  engine: EmailTemplateEngine,
  data: SubmissionStatusTemplateData,
): NotificationTemplateRenderResult => {
  assertNonEmptyString(data.status, 'status');

  if (data.status === 'approved') {
    const approved = data.data as SubmissionApprovedTemplateData;
    assertNonEmptyString(approved.username, 'username');
    assertNonEmptyString(approved.questTitle, 'questTitle');
    assertNumberOptional(approved.rewardAmount, 'rewardAmount');

    const rendered = engine.render(submissionApprovedEmailTemplate, {
      username: approved.username,
      questTitle: approved.questTitle,
      rewardAmount: approved.rewardAmount,
    });

    return rendered;
  }

  // rejected
  const rejected = data.data as SubmissionRejectedTemplateData;
  assertNonEmptyString(rejected.username, 'username');
  assertNonEmptyString(rejected.questTitle, 'questTitle');
  assertNonEmptyString(rejected.reason, 'reason');

  const rendered = engine.render(submissionRejectedEmailTemplate, {
    username: rejected.username,
    questTitle: rejected.questTitle,
    reason: rejected.reason,
  });

  return rendered;
};
