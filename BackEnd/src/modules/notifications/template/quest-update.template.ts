import {
  questUpdateEmailTemplate,
  QuestUpdateTemplateData,
  type NotificationTemplateRenderResult,
  type NotificationTemplateRenderFn,
} from './notification.interface';
import type { EmailTemplateEngine } from '#src/modules/email/templates/template.engine';

const assertNonEmptyString = (value: unknown, field: string): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${field}`);
  }
};

export const renderQuestUpdateTemplate: NotificationTemplateRenderFn<
  QuestUpdateTemplateData
> = (
  engine: EmailTemplateEngine,
  data: QuestUpdateTemplateData,
): NotificationTemplateRenderResult => {
  assertNonEmptyString(data.username, 'username');
  assertNonEmptyString(data.questTitle, 'questTitle');
  assertNonEmptyString(data.status, 'status');

  const title = `Quest ${data.status}`;
  const message = `There is an update on the quest "${data.questTitle}". ${
    data.status === 'approved'
      ? 'It has been approved.'
      : data.status === 'cancelled'
        ? 'It has been cancelled.'
        : 'It has expired.'
  }`;

  // Quest updates are mapped onto the general notification email.
  // The email engine expects: { username, title, message, ctaText?, ctaUrl? }.
  const rendered = engine.render(questUpdateEmailTemplate, {
    username: data.username,
    title,
    message,
  });

  return rendered;
};
