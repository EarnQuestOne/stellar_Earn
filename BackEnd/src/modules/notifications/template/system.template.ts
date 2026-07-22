import {
  systemAnnouncementEmailTemplate,
  type NotificationTemplateRenderResult,
  type NotificationTemplateRenderFn,
  type SystemAnnouncementTemplateData,
} from './notification.interface';
import type { EmailTemplateEngine } from '#src/modules/email/templates/template.engine';

const assertNonEmptyString = (value: unknown, field: string): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${field}`);
  }
};

export const renderSystemAnnouncementTemplate: NotificationTemplateRenderFn<
  SystemAnnouncementTemplateData
> = (
  engine: EmailTemplateEngine,
  data: SystemAnnouncementTemplateData,
): NotificationTemplateRenderResult => {
  assertNonEmptyString(data.username, 'username');
  assertNonEmptyString(data.message, 'message');

  const rendered = engine.render(systemAnnouncementEmailTemplate, {
    username: data.username,
    title: data.title,
    message: data.message,
    ctaText: data.ctaText,
    ctaUrl: data.ctaUrl,
  });

  return rendered;
};
