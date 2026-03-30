import { Injectable } from '@nestjs/common';

export enum NotificationTemplateType {
  SUBMISSION_APPROVED = 'SUBMISSION_APPROVED',
  SUBMISSION_REJECTED = 'SUBMISSION_REJECTED',
  QUEST_UPDATE = 'QUEST_UPDATE',
  SYSTEM = 'SYSTEM',
}

@Injectable()
export class NotificationTemplateService {
  private templates: Map<NotificationTemplateType, (data: any) => string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    this.templates.set(
      NotificationTemplateType.SUBMISSION_APPROVED,
      (data) => `Congratulations! Your submission for "${data.questTitle}" has been approved. You've earned ${data.rewardAmount} tokens.`,
    );
    this.templates.set(
      NotificationTemplateType.SUBMISSION_REJECTED,
      (data) => `Your submission for "${data.questTitle}" was not approved. Reason: ${data.reason}`,
    );
    this.templates.set(
      NotificationTemplateType.QUEST_UPDATE,
      (data) => `There is an update on the quest "${data.questTitle}". Check it out!`,
    );
    this.templates.set(
      NotificationTemplateType.SYSTEM,
      (data) => `${data.message}`,
    );
  }

  render(type: NotificationTemplateType, data: any): string {
    const template = this.templates.get(type);
    if (!template) {
      return data.message || '';
    }
    return template(data);
  }
}
