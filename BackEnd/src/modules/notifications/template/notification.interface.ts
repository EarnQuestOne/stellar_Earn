import { EmailTemplate } from '#src/modules/email/dto/email.dto';
import type { EmailTemplateEngine } from '#src/modules/email/templates/template.engine';

export interface NotificationTemplateRenderResult {
  subject: string;
  html: string;
  text: string;
}

export type NotificationTemplateRenderFn<TData> = (
  engine: EmailTemplateEngine,
  data: TData,
) => NotificationTemplateRenderResult;

// -------------------------
// Quest update
// -------------------------

export type QuestUpdateStatus = 'approved' | 'cancelled' | 'expired';

export interface QuestUpdateTemplateData {
  username: string;
  questTitle: string;
  status: QuestUpdateStatus;
}

export const questUpdateEmailTemplate: EmailTemplate =
  EmailTemplate.GENERAL_NOTIFICATION;

// -------------------------
// Submission status
// -------------------------

export type SubmissionStatus = 'approved' | 'rejected';

export interface SubmissionApprovedTemplateData {
  username: string;
  questTitle: string;
  rewardAmount?: number;
}

export interface SubmissionRejectedTemplateData {
  username: string;
  questTitle: string;
  reason: string;
}

export const submissionApprovedEmailTemplate: EmailTemplate =
  EmailTemplate.SUBMISSION_APPROVED;
export const submissionRejectedEmailTemplate: EmailTemplate =
  EmailTemplate.SUBMISSION_REJECTED;

export interface SubmissionStatusTemplateData {
  status: SubmissionStatus;
  data: SubmissionApprovedTemplateData | SubmissionRejectedTemplateData;
}

// -------------------------
// System announcement
// -------------------------

export interface SystemAnnouncementTemplateData {
  username: string;
  title?: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}

export const systemAnnouncementEmailTemplate: EmailTemplate =
  EmailTemplate.GENERAL_NOTIFICATION;
